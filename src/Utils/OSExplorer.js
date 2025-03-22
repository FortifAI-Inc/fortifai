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

    async getInstanceInfoViaSSM(instanceId) {
        const ssm = new SSMClient({ region: this.#AWS_REGION });
        
        try {
            const results = {
                files: null,
                processes: null
            };

            // Command to get files
            const filesCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: ['find / -type f 2>/dev/null']
                }
            });

            // Command to get processes
            const processesCommand = new SendCommandCommand({
                InstanceIds: [instanceId],
                DocumentName: 'AWS-RunShellScript',
                Parameters: {
                    commands: ['ps aux']
                }
            });

            // Execute commands in parallel
            const [filesResponse, processesResponse] = await Promise.all([
                ssm.send(filesCommand),
                ssm.send(processesCommand)
            ]);

            const commandId1 = filesResponse.Command.CommandId;
            const commandId2 = processesResponse.Command.CommandId;

            // Helper function to wait for command completion
            const waitForCommand = async (commandId, instanceId) => {
                const maxAttempts = 10;
                const delaySeconds = 3;
                
                // Initial delay before first check
                console.log('Waiting for initial command registration...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    try {
                        const getCommandOutput = new GetCommandInvocationCommand({
                            CommandId: commandId,
                            InstanceId: instanceId
                        });
                        
                        const output = await ssm.send(getCommandOutput);
                        
                        // Add detailed logging
                        console.log(`Command status: ${output.Status}`);
                        console.log(`Status details: ${output.StatusDetails}`);
                        
                        if (output.Status === 'Success') {
                            // Log the output structure
                            console.log('Command output structure:', JSON.stringify(output, null, 2));
                            return output;
                        } else if (output.Status === 'Failed') {
                            throw new Error(`Command failed: ${output.StatusDetails}`);
                        }
                        
                        console.log(`Waiting for command completion... Status: ${output.Status}`);
                        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                    } catch (error) {
                        if (error.name === 'InvocationDoesNotExist') {
                            console.log('Command not yet registered, waiting...');
                            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                            continue;
                        }
                        throw error;
                    }
                }
                throw new Error('Command timed out');
            };

            // Wait for both commands to complete
            console.log('Waiting for commands to complete...');
            const [filesOutput, processesOutput] = await Promise.all([
                waitForCommand(commandId1, instanceId),
                waitForCommand(commandId2, instanceId)
            ]);

            // Debug logging
            console.log('Files command output:', JSON.stringify(filesOutput, null, 2));
            console.log('Process command output:', JSON.stringify(processesOutput, null, 2));

            // More robust output checking
            if (!filesOutput || typeof filesOutput.StandardOutput !== 'string') {
                throw new Error(`Invalid file listing output. Output: ${JSON.stringify(filesOutput)}`);
            }

            if (!processesOutput || typeof processesOutput.StandardOutput !== 'string') {
                throw new Error(`Invalid process listing output. Output: ${JSON.stringify(processesOutput)}`);
            }

            results.files = filesOutput.StandardOutput.split('\n').filter(Boolean);
            results.processes = processesOutput.StandardOutput.split('\n').filter(Boolean);

            return results;
        } catch (error) {
            console.error('Error getting instance info via SSM:', error);
            console.error('Make sure:');
            console.error('1. The instance has SSM agent installed and running');
            console.error('2. The instance has the necessary IAM role with SSM permissions');
            console.error('3. Your AWS credentials have SSM permissions');
            console.error('4. The instance is in the correct region');
            throw error;
        }
    }

    async exploreInstanceViaSSM(instanceId, region) {
        try {
            const instanceInfo = await this.getInstanceInfoViaSSM(instanceId, region);
            return instanceInfo;
        } catch (error) {
            console.error('Error exploring instance via SSM:', error);
            throw error;
        }
    }
}

// Add main function for demonstration
async function main() {
    try {
        const explorer = new OSExplorer();
        const instanceId = process.argv[2]; // Get instance ID from command line argument
        
        if (!instanceId) {
            console.error('Please provide an instance ID as an argument');
            console.log('Usage: node OSExplorer.js <instance-id>');
            process.exit(1);
        }

        console.log(`Retrieving information for instance ${instanceId}...`);
        const results = await explorer.exploreInstanceViaSSM(instanceId);
        
        console.log('\n=== Files ===');
        console.log(results.files.slice(0, 10).join('\n')); // Show first 10 files
        console.log(`... and ${results.files.length - 10} more files`);
        
        console.log('\n=== Processes ===');
        console.log(results.processes.slice(0, 10).join('\n')); // Show first 10 processes
        console.log(`... and ${results.processes.length - 10} more processes`);
        
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
