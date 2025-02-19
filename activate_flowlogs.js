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
    // Get list of all EC2 instances, then get the network interface ID of each of them and call enableFlowLogs for each interface ID
    try {
        // Get EC2 instances
        const ec2Instances = await ec2.describeInstances().promise();
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
