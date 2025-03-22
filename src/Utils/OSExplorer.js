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

    async getInstanceInfoViaSSM(instanceId, region = 'us-east-1') {
        const ssm = new SSMClient({ region });
        
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

            // Wait for command completion and get output
            const commandId1 = filesResponse.Command.CommandId;
            const commandId2 = processesResponse.Command.CommandId;

            // Poll for results (simplified for brevity)
            await new Promise(resolve => setTimeout(resolve, 5000));

            const getCommandOutput = new GetCommandInvocationCommand({
                CommandId: commandId1,
                InstanceId: instanceId
            });
            const getProcessOutput = new GetCommandInvocationCommand({
                CommandId: commandId2,
                InstanceId: instanceId
            });

            const [filesOutput, processesOutput] = await Promise.all([
                ssm.send(getCommandOutput),
                ssm.send(getProcessOutput)
            ]);

            results.files = filesOutput.StandardOutput.split('\n').filter(Boolean);
            results.processes = processesOutput.StandardOutput.split('\n').filter(Boolean);

            return results;
        } catch (error) {
            console.error('Error getting instance info via SSM:', error);
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
