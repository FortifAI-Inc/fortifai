const AWS = require('aws-sdk');
const flow_logs = require('./src/flow_logs');

AWS.config.update({ region: 'us-east-1' }); // Update to your region
console.log("Enabling flow logs...");

async function main() {
    const ec2 = new AWS.EC2();
    const s3 = new AWS.S3();
    const rds = new AWS.RDS();
    const lambda = new AWS.Lambda();
    //const vpc = new AWS.VPC();

    try {
        // Get VPCs
        const vpcs = await ec2.describeVpcs().promise();
        //console.log("VPCs:", vpcs.Vpcs);
        console.log("VPCs count:", vpcs.Vpcs.length);

        for (const vpc of vpcs.Vpcs) {
            // Enable VPC flow logs
            flow_logs.enableFlowLogs(vpc.VpcId);
            console.log(`Enabled logs for VPC ${vpc.VpcId}`);
	}
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

main();
