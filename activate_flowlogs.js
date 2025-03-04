const { EC2 } = require("@aws-sdk/client-ec2");
const { Lambda } = require("@aws-sdk/client-lambda");
const { RDS } = require("@aws-sdk/client-rds");
const { S3 } = require("@aws-sdk/client-s3");

const flow_logs = require('./src/flow_logs');

// JS SDK v3 does not support global configuration.
// Codemod has attempted to pass values to each service client in this file.
// You may need to update clients outside of this file, if they use global config.
console.log("Enabling flow logs...");

async function main() {
    const ec2 = new EC2({
        region: 'us-east-1'
    });
    const s3 = new S3({
        region: 'us-east-1'
    });
    const rds = new RDS({
        region: 'us-east-1'
    });
    const lambda = new Lambda({
        region: 'us-east-1'
    });
    //const vpc = new AWS.VPC();
    // Get list of all EC2 instances, then get the network interface ID of each of them and call enableFlowLogs for each interface ID
    try {
        // Get EC2 instances
        const ec2Instances = await ec2.describeInstances();
        const instanceList = ec2Instances.Reservations.map(reservation => reservation.Instances).flat();
        console.log("EC2 Instances count:", instanceList.length);

        for (const instance of instanceList) {
            const networkInterfaceId = instance.NetworkInterfaces[0].NetworkInterfaceId;
            console.log("Network Interface ID:", networkInterfaceId);
            flow_logs.enableFlowLogs(networkInterfaceId);
            console.log(`Enabled logs for Network Interface ID ${networkInterfaceId}`);
        }
    } catch (error) {
        console.error("Error in main function:", error);
    }
/*    try {
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
    }*/
}

main();
