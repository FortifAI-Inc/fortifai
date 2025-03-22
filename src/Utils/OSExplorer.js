const { Client } = require('ssh2');
const { 
    SSMClient, 
    SendCommandCommand,
    GetCommandInvocationCommand
} = require("@aws-sdk/client-ssm");
const path = require('path');
const fs = require('fs');

class OSExplorer {
    async getInstanceInfo(instanceConfig) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            
            conn.on('ready', () => {
                const results = {
                    files: null,
                    processes: null
                };
                
                // Get file listing
                conn.exec('find / -type f 2>/dev/null', (err, stream) => {
                    if (err) reject(err);
                    let fileData = '';
                    stream.on('data', (data) => {
                        fileData += data;
                    }).on('end', () => {
                        results.files = fileData.split('\n').filter(Boolean);
                        
                        // Get process listing
                        conn.exec('ps aux', (err, stream) => {
                            if (err) reject(err);
                            let processData = '';
                            stream.on('data', (data) => {
                                processData += data;
                            }).on('end', () => {
                                results.processes = processData.split('\n').filter(Boolean);
                                conn.end();
                                resolve(results);
                            });
                        });
                    });
                });
            }).connect(instanceConfig);
            
            conn.on('error', (err) => {
                reject(err);
            });
        });
    }

    createInstanceConfig(host, username, privateKeyPath) {
        return {
            host,
            username,
            privateKey: require('fs').readFileSync(privateKeyPath)
        };
    }

    async exploreInstance(host, username, privateKeyPath) {
        try {
            const config = this.createInstanceConfig(host, username, privateKeyPath);
            const instanceInfo = await this.getInstanceInfo(config);
            return instanceInfo;
        } catch (error) {
            console.error('Error exploring instance:', error);
            throw error;
        }
    }

    // Default region from environment or fallback to eu-north-1
    #AWS_REGION = process.env.AWS_REGION || 'eu-north-1';

    async getProcessesViaSSM(instanceId) {
        const ssm = new SSMClient({ region: this.#AWS_REGION });
        
        try {
            // Command to get processes
            const processesCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: ['ps aux']
                }
            });

            const processesResponse = await ssm.send(processesCommand);
            const commandId = processesResponse.Command.CommandId;

            // Helper function to wait for command completion
            const waitForCommand = async (commandId, instanceId) => {
                const maxAttempts = 10;
                const delaySeconds = 3;
                
                console.log('Waiting for process list command to complete...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    try {
                        const getCommandOutput = new GetCommandInvocationCommand({
                            CommandId: commandId,
                            InstanceId: instanceId
                        });
                        
                        const output = await ssm.send(getCommandOutput);
                        console.log(`Process command status: ${output.Status}`);
                        
                        if (output.Status === 'Success') {
                            return output;
                        } else if (output.Status === 'Failed') {
                            throw new Error(`Process command failed: ${output.StatusDetails}`);
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                    } catch (error) {
                        if (error.name === 'InvocationDoesNotExist') {
                            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                            continue;
                        }
                        throw error;
                    }
                }
                throw new Error('Process command timed out');
            };

            const output = await waitForCommand(commandId, instanceId);
            
            if (!output?.StandardOutputContent) {
                throw new Error('No process listing output received');
            }

            return output.StandardOutputContent.split('\n').filter(Boolean);
        } catch (error) {
            console.error('Error getting process info:', error);
            throw error;
        }
    }

    async getFilesystemViaSSM(instanceId) {
        const ssm = new SSMClient({ region: this.#AWS_REGION });
        
        try {
            // Create temporary file on target system, save listing, and count total files
            const tempFileName = `/tmp/file_listing_${Date.now()}.txt`;
            const filesCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: [
                        // Count total files first
                        'echo "Starting file enumeration..."',
                        `total_files=$(find / -type f 2>/dev/null | wc -l)`,
                        'echo "Total files found: $total_files"',
                        // Save full listing to temp file
                        `find / -type f 2>/dev/null > ${tempFileName}`,
                        // Split into smaller chunks that SSM can handle
                        `split -b 20m ${tempFileName} ${tempFileName}_part_`,
                        // List the parts
                        `ls -l ${tempFileName}_part_*`,
                        // Get number of parts
                        `ls ${tempFileName}_part_* | wc -l`
                    ]
                }
            });

            console.log('Creating file listing on target system...');
            const filesResponse = await ssm.send(filesCommand);
            const commandId = filesResponse.Command.CommandId;

            // Helper function to wait for command completion
            const waitForCommand = async (commandId, instanceId) => {
                const maxAttempts = 10;
                const delaySeconds = 3;
                
                console.log('Waiting for filesystem command to complete...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    try {
                        const getCommandOutput = new GetCommandInvocationCommand({
                            CommandId: commandId,
                            InstanceId: instanceId
                        });
                        
                        const output = await ssm.send(getCommandOutput);
                        console.log(`Filesystem command status: ${output.Status}`);
                        
                        if (output.Status === 'Success') {
                            return output;
                        } else if (output.Status === 'Failed') {
                            throw new Error(`Filesystem command failed: ${output.StatusDetails}`);
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                    } catch (error) {
                        if (error.name === 'InvocationDoesNotExist') {
                            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                            continue;
                        }
                        throw error;
                    }
                }
                throw new Error('Filesystem command timed out');
            };

            const initialOutput = await waitForCommand(commandId, instanceId);
            console.log('Initial file listing complete. Reading parts...');

            // Get the number of parts from the last line
            const numParts = parseInt(initialOutput.StandardOutputContent.split('\n').pop());
            let allFiles = [];

            // Read each part
            for (let i = 0; i < numParts; i++) {
                const partFile = `${tempFileName}_part_${String.fromCharCode(97 + i)}`; // parts are named a, b, c, etc.
                const readCommand = new SendCommandCommand({
                    InstanceIds: [instanceId],
                    DocumentName: 'AWS-RunShellScript',
                    Parameters: {
                        commands: [`cat ${partFile}`]
                    }
                });

                console.log(`Reading part ${i + 1} of ${numParts}...`);
                const readResponse = await ssm.send(readCommand);
                const readOutput = await waitForCommand(readResponse.Command.CommandId, instanceId);
                
                if (readOutput?.StandardOutputContent) {
                    allFiles = allFiles.concat(readOutput.StandardOutputContent.split('\n').filter(Boolean));
                }
            }

            // Cleanup temporary files
            const cleanupCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: [
                        `rm ${tempFileName}*`,
                        'echo "Cleanup complete"'
                    ]
                }
            });

            console.log('Cleaning up temporary files...');
            await ssm.send(cleanupCommand);

            return allFiles;
        } catch (error) {
            console.error('Error getting filesystem info:', error);
            // Attempt cleanup on error
            try {
                const cleanupCommand = new SendCommandCommand({
                    InstanceIds: [instanceId],
                    DocumentName: 'AWS-RunShellScript',
                    Parameters: {
                        commands: [
                            `rm -f /tmp/file_listing_*`,
                            'echo "Emergency cleanup complete"'
                        ]
                    }
                });
                await ssm.send(cleanupCommand);
            } catch (cleanupError) {
                console.error('Error during cleanup:', cleanupError);
            }
            throw error;
        }
    }

    // Updated main exploration method
    async exploreInstanceViaSSM(instanceId) {
        try {
            console.log('Getting process list...');
            const processes = await this.getProcessesViaSSM(instanceId);
            
            console.log('Getting filesystem list...');
            const files = await this.getFilesystemViaSSM(instanceId);

            return {
                processes,
                files
            };
        } catch (error) {
            console.error('Error exploring instance via SSM:', error);
            throw error;
        }
    }

    async getFileFromInstanceViaSSM(instanceId, remotePath) {
        const ssm = new SSMClient({ region: this.#AWS_REGION });
        
        try {
            // First check if file exists and get its size
            const checkCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: [
                        `if [ -f "${remotePath}" ]; then`,
                        '  echo "FILE_EXISTS"',
                        `  stat -f %z "${remotePath}" 2>/dev/null || stat -c %s "${remotePath}"`,
                        'else',
                        '  echo "FILE_NOT_FOUND"',
                        'fi'
                    ]
                }
            });

            console.log(`Checking file ${remotePath}...`);
            const checkResponse = await ssm.send(checkCommand);
            const checkOutput = await this.waitForCommand(checkResponse.Command.CommandId, instanceId, ssm);

            const [fileStatus, fileSize] = checkOutput.StandardOutputContent.trim().split('\n');
            
            if (fileStatus === 'FILE_NOT_FOUND') {
                throw new Error(`File not found: ${remotePath}`);
            }

            console.log(`File size: ${fileSize} bytes`);

            // For large files, we need to split the reading
            const maxChunkSize = 20 * 1024 * 1024; // 20MB chunks
            const totalChunks = Math.ceil(parseInt(fileSize) / maxChunkSize);
            
            if (totalChunks > 1) {
                console.log(`Large file detected, will read in ${totalChunks} chunks`);
            }

            let fileContent = Buffer.from('');
            
            for (let chunk = 0; chunk < totalChunks; chunk++) {
                const start = chunk * maxChunkSize;
                const length = Math.min(maxChunkSize, parseInt(fileSize) - start);

                const readCommand = new SendCommandCommand({
                    InstanceIds: [instanceId],
                    DocumentName: 'AWS-RunShellScript',
                    Parameters: {
                        commands: [
                            // Use dd to read specific chunks and base64 encode them
                            `dd if="${remotePath}" bs=1 skip=${start} count=${length} 2>/dev/null | base64`
                        ]
                    }
                });

                console.log(`Reading chunk ${chunk + 1}/${totalChunks}...`);
                const readResponse = await ssm.send(readCommand);
                const readOutput = await this.waitForCommand(readResponse.Command.CommandId, instanceId, ssm);

                if (!readOutput?.StandardOutputContent) {
                    throw new Error(`Failed to read chunk ${chunk + 1}`);
                }

                // Decode base64 chunk and append to result
                const chunkContent = Buffer.from(readOutput.StandardOutputContent, 'base64');
                fileContent = Buffer.concat([fileContent, chunkContent]);
            }

            return fileContent;
        } catch (error) {
            console.error('Error retrieving file:', error);
            throw error;
        }
    }

    // Helper method to wait for command completion (extracted from existing code)
    async waitForCommand(commandId, instanceId, ssm) {
        const maxAttempts = 10;
        const delaySeconds = 3;
        
        console.log('Waiting for command to complete...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const getCommandOutput = new GetCommandInvocationCommand({
                    CommandId: commandId,
                    InstanceId: instanceId
                });
                
                const output = await ssm.send(getCommandOutput);
                console.log(`Command status: ${output.Status}`);
                
                if (output.Status === 'Success') {
                    return output;
                } else if (output.Status === 'Failed') {
                    throw new Error(`Command failed: ${output.StatusDetails}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            } catch (error) {
                if (error.name === 'InvocationDoesNotExist') {
                    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Command timed out');
    }
}

// Updated main function
async function main() {
    try {
        const explorer = new OSExplorer();
        const instanceId = process.argv[2];
        const filePath = process.argv[3];
        
        if (!instanceId || !filePath) {
            console.error('Please provide instance ID and file path');
            console.log('Usage: node OSExplorer.js <instance-id> <file-path>');
            process.exit(1);
        }

        console.log(`Retrieving file ${filePath} from instance ${instanceId}...`);
        const fileContent = await explorer.getFileFromInstanceViaSSM(instanceId, filePath);
        
        // Save to local file
        const localPath = path.basename(filePath);
        fs.writeFileSync(localPath, fileContent);
        console.log(`File saved locally as: ${localPath}`);
        console.log(`File size: ${fileContent.length} bytes`);
        
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

// Run main function if file is executed directly
if (require.main === module) {
    main();
}

module.exports = OSExplorer;
