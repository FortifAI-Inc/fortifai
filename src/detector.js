const AWS = require('aws-sdk');
const flow_logs = require('./flow_logs');


AWS.config.update({ region: 'us-east-1' }); // Update to your region


/// TBD: https://github.com/thiagosanches/awscraper/tree/main/scrapers has many more scrapers, e.g. glue jobs, Lambdas and more
/// TBD: map ECS / EKS workloads



// This function should interface with AWS's infrastructure and obtain a list of all provisioned elements - EC2, VPCs, SGs etc
// This function should be called at the start of the program
async function inventoryAWSEnvironment() {
    console.log("Inventorying AWS environment...");
    const ec2 = new AWS.EC2();
    const s3 = new AWS.S3();
    const rds = new AWS.RDS();
    const lambda = new AWS.Lambda();
    //const vpc = new AWS.VPC();

    try {
        // Get EC2 instances
        const ec2Instances = await ec2.describeInstances().promise();
        const instanceList = ec2Instances.Reservations.map(reservation => reservation.Instances).flat();
        //console.log("EC2 Instances:", instanceList);
        console.log("EC2 Instances count:", instanceList.length);

        // Get VPCs
        const vpcs = await ec2.describeVpcs().promise();
        //console.log("VPCs:", vpcs.Vpcs);
        console.log("VPCs count:", vpcs.Vpcs.length);

        for (const vpc of vpcs.Vpcs) {
            // Enable VPC flow logs
            //flow_logs.enableFlowLogs(vpc.VpcId);
            console.log(`Enabled logs for VPC ${vpc.VpcId}`);
        }

        // Get S3 buckets
        const s3Buckets = await s3.listBuckets().promise();
        //console.log("S3 Buckets:", s3Buckets.Buckets);
        console.log("S3 Buckets count:", s3Buckets.Buckets.length);

        // Get RDS instances
        const rdsInstances = await rds.describeDBInstances().promise();
        //console.log("RDS Instances:", rdsInstances.DBInstances);
        console.log("RDS Instances count:", rdsInstances.DBInstances.length);

        // Get Lambda functions
        const lambdaFunctions = await lambda.listFunctions().promise();
        //console.log("Lambda Functions:", lambdaFunctions.Functions);
        console.log("Lambda Functions count:", lambdaFunctions.Functions.length);

     
        // Compile the inventory
        const inventory = {
            ec2Instances: instanceList,
            s3Buckets: s3Buckets.Buckets,
            rdsInstances: rdsInstances.DBInstances,
            lambdaFunctions: lambdaFunctions.Functions,
            //vpcs: vpcs.Vpcs
        };

        return inventory;
    } catch (error) {
        console.error("Error retrieving AWS resources:", error);
        throw error;
    }

}

function collectRunningProcesses() {
    console.log("Collecting running processes...");
    // TODO: Implement logic to collect running processes
}

function collectResourceUtilization() {
    console.log("Collecting resource utilization...");
    // TODO: Implement logic to collect resource utilization
}

function collectNetworkActivity() {
    console.log("Collecting network activity...");
    // TODO: Implement logic to collect network activity
}


function collectAllLogs() {
    console.log("Collecting all logs...");
    // TODO: Implement logic to collect all logs
}

module.exports = {
    inventoryAWSEnvironment,
    collectRunningProcesses,
    collectResourceUtilization,
    collectNetworkActivity,
    collectAllLogs
};
