const { Client } = require('ssh2');
const { 
    SSMClient, 
    SendCommandCommand,
    GetCommandInvocationCommand
} = require("@aws-sdk/client-ssm");

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
}

// Updated main function
async function main() {
    try {
        const explorer = new OSExplorer();
        const instanceId = process.argv[2];
        
        if (!instanceId) {
            console.error('Please provide an instance ID as an argument');
            console.log('Usage: node OSExplorer.js <instance-id>');
            process.exit(1);
        }

        console.log(`Retrieving information for instance ${instanceId}...`);
        
        // Get processes first
        console.log('\nRetrieving process list...');
        const processes = await explorer.getProcessesViaSSM(instanceId);
        console.log('\n=== Processes ===');
        console.log(processes.slice(0, 10).join('\n'));
        console.log(`... and ${processes.length - 10} more processes`);
        
        // Then get filesystem
        console.log('\nRetrieving filesystem list...');
        const files = await explorer.getFilesystemViaSSM(instanceId);
        console.log('\n=== Files ===');
        console.log(files.slice(0, 10).join('\n'));
        console.log(`... and ${files.length - 10} more files`);
        
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
