const { Client } = require('ssh2');
const {
    SSMClient,
    SendCommandCommand,
    GetCommandInvocationCommand
} = require("@aws-sdk/client-ssm");
const path = require('path');
const fs = require('fs');

class OSExplorer {
    #AWS_REGION = process.env.AWS_REGION || 'eu-north-1';

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

    async getProcessesViaSSM(instanceId) {
        const ssm = new SSMClient({ region: this.#AWS_REGION });

        try {
            // Command to get processes
            const processesCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: ['ps auxww']
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
            // Command to get files
            const filesCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: ['find / -type f 2>/dev/null']
                }
            });

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

            const output = await waitForCommand(commandId, instanceId);

            if (!output?.StandardOutputContent) {
                throw new Error('No filesystem listing output received');
            }
            console.log('output.StandardOutputContent.length', output.StandardOutputContent.length);
            console.log(output);

            return output.StandardOutputContent.split('\n').filter(Boolean);
        } catch (error) {
            console.error('Error getting filesystem info:', error);
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

    async createFileListingChunks(instanceId) {
        const ssm = new SSMClient({ region: this.#AWS_REGION });
        
        try {
            // The script, with escaped variables
            const script = `#!/bin/bash

# Set up working directory
WORKDIR=$(mktemp -d)
OUTPUT="$WORKDIR/filesystem_list.txt"
COMPRESSED="$WORKDIR/filesystem_list.txt.gz"
ENCODED="$WORKDIR/filesystem_list.b64"
CHUNK_PREFIX="chunk_"
CHUNK_SIZE=23950

echo "Listing all files in the filesystem. This may take a while..."
find / -type f 2>/dev/null > "$OUTPUT"

echo "Compressing the output..."
gzip -c "$OUTPUT" > "$COMPRESSED"

echo "Encoding to base64..."
base64 "$COMPRESSED" > "$ENCODED"

echo "Splitting into chunks of $CHUNK_SIZE bytes..."
split -b $CHUNK_SIZE -d --additional-suffix=.b64 "$ENCODED" "$WORKDIR/$CHUNK_PREFIX"

echo "Chunks created in: $WORKDIR"
ls -lh "$WORKDIR/$CHUNK_PREFIX"*.b64 | tail -n 1 | awk '{print $9}'
NUMFILES=\`ls -lh $WORKDIR/$CHUNK_PREFIX*.b64 | wc -l\`

# Echo the working directory for later use
echo "WORKDIR=$WORKDIR"
echo "LASTCHUNK=\`ls -lh $WORKDIR/$CHUNK_PREFIX*.b64 | tail -n 1 | awk \'{print $9}\'\`"
echo "NUMFILES=$NUMFILES"
`;

            // Send the script command
            const scriptCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: [script]
                }
            });

            console.log('Initiating file listing script...');
            const scriptResponse = await ssm.send(scriptCommand);
            const commandId = scriptResponse.Command.CommandId;

            // Wait for script completion
            const waitForCommand = async (commandId, instanceId) => {
                const maxAttempts = 20; // Increased attempts due to longer operation
                const delaySeconds = 3;

                console.log('Waiting for script to complete...');
                await new Promise(resolve => setTimeout(resolve, 5000));

                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    try {
                        const getCommandOutput = new GetCommandInvocationCommand({
                            CommandId: commandId,
                            InstanceId: instanceId
                        });

                        const output = await ssm.send(getCommandOutput);
                        console.log(`Script status: ${output.Status}`);

                        if (output.Status === 'Success') {
                            return output;
                        } else if (output.Status === 'Failed') {
                            throw new Error(`Script failed: ${output.StatusDetails}`);
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
                throw new Error('Script execution timed out');
            };

            const output = await waitForCommand(commandId, instanceId);
            
            if (!output?.StandardOutputContent) {
                throw new Error('No script output received');
            }

            // Parse the output to get the working directory and chunk count
            const lines = output.StandardOutputContent.split('\n');
            const workdirLine = lines.find(line => line.startsWith('WORKDIR='));
            const numFilesLine = lines.find(line => line.startsWith('NUMFILES='));
            
            if (!workdirLine || !numFilesLine) {
                throw new Error('Could not find working directory or chunk count in script output');
            }

            const workdir = workdirLine.split('=')[1];
            const chunkCount = parseInt(numFilesLine.split('=')[1]);
            
            console.log(`Found ${chunkCount} chunks in ${workdir}`);

            // Read all chunks
            let concatenatedBase64 = '';
            
            for (let i = 0; i < chunkCount; i++) {
                const chunkNum = i.toString().padStart(2, '0');
                const getChunkCommand = new SendCommandCommand({
                    InstanceIds: [instanceId],
                    DocumentName: 'AWS-RunShellScript',
                    Parameters: {
                        commands: [`cat ${workdir}/chunk_${chunkNum}.b64`]
                    }
                });

                console.log(`Reading chunk ${i + 1}/${chunkCount}...`);
                const chunkResponse = await ssm.send(getChunkCommand);
                const chunkOutput = await waitForCommand(chunkResponse.Command.CommandId, instanceId);
                
                if (!chunkOutput?.StandardOutputContent) {
                    throw new Error(`Failed to read chunk ${chunkNum}`);
                }

                concatenatedBase64 += chunkOutput.StandardOutputContent;
            }
            console.log('concatenatedBase64.length', concatenatedBase64.length);

            // Decode base64 and decompress
            console.log('Decoding and decompressing data...');
            const compressed = Buffer.from(concatenatedBase64, 'base64');
            const { gunzip } = require('zlib');
            const util = require('util');
            const gunzipAsync = util.promisify(gunzip);
            
            const decompressed = await gunzipAsync(compressed);
            const fileList = decompressed.toString().split('\n').filter(Boolean);

            // Cleanup command
            const cleanupCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: [`rm -rf ${workdir}`]
                }
            });

            console.log('Cleaning up temporary files...');
            await ssm.send(cleanupCommand);

            return fileList;
        } catch (error) {
            console.error('Error executing file listing script:', error);
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
        /*console.log('\nRetrieving process list...');
        const processes = await explorer.getProcessesViaSSM(instanceId);
        console.log('\n=== Processes ===');
        console.log(processes.slice(0, 10).join('\n'));
        console.log(`... and ${processes.length - 10} more processes`);*/

        // Then get filesystem
        console.log('\nRetrieving filesystem list...');
        const { workdir, output, chunkCount } = await explorer.createFileListingChunks(instanceId);
        console.log('\n=== Files ===');
        console.log(output);
        //console.log(`... and ${output.length - 10} more files`);

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
