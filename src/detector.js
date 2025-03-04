const { EC2 } = require("@aws-sdk/client-ec2");
const { Lambda } = require("@aws-sdk/client-lambda");
const { RDS } = require("@aws-sdk/client-rds");
const { S3 } = require("@aws-sdk/client-s3");

const flow_logs = require('./flow_logs');
const DL_access = require('./DataLake/DL_access');


// JS SDK v3 does not support global configuration.
// Codemod has attempted to pass values to each service client in this file.
// You may need to update clients outside of this file, if they use global config.


/// TBD: https://github.com/thiagosanches/awscraper/tree/main/scrapers has many more scrapers, e.g. glue jobs, Lambdas and more
/// TBD: map ECS / EKS workloads



// This function should interface with AWS's infrastructure and obtain a list of all provisioned elements - EC2, VPCs, SGs etc
// This function should be called at the start of the program
async function inventoryAWSEnvironment() {
    console.log("Inventorying AWS environment...");
    const ec2 = new EC2({
        region: 'us-east-1',
    });
    const s3 = new S3({
        region: 'us-east-1',
    });
    const rds = new RDS({
        region: 'us-east-1',
    });
    const lambda = new Lambda({
        region: 'us-east-1',
    });
    //const vpc = new AWS.VPC();

    try {
        // Get EC2 instances
        const ec2Instances = await ec2.describeInstances();
        const instanceList = ec2Instances.Reservations.map(reservation => reservation.Instances).flat();
        for (const instance of instanceList) {
            DL_access.writeData('asset', 'EC2', instance);
        }   
        //console.log("EC2 Instances:", instanceList);
        console.log("EC2 Instances count:", instanceList.length);

        // Get VPCs
        const vpcs = await ec2.describeVpcs();
        //console.log("VPCs:", vpcs.Vpcs);
        console.log("VPCs count:", vpcs.Vpcs.length);

        for (const vpc of vpcs.Vpcs) {
            // Enable VPC flow logs
            //flow_logs.enableFlowLogs(vpc.VpcId);
            //console.log(`Enabled logs for VPC ${vpc.VpcId}`);
            DL_access.writeData('asset', 'VPC', vpc);
        }

        // Get S3 buckets
        const s3Buckets = await s3.listBuckets();
        //console.log("S3 Buckets:", s3Buckets.Buckets);
        for (const bucket of s3Buckets.Buckets) {
            DL_access.writeData('asset', 'S3Bucket', bucket);
        }
        console.log("S3 Buckets count:", s3Buckets.Buckets.length);

        // Get RDS instances
        const rdsInstances = await rds.describeDBInstances();
        //console.log("RDS Instances:", rdsInstances.DBInstances);
        console.log("RDS Instances count:", rdsInstances.DBInstances.length);

        // Get Lambda functions
        const lambdaFunctions = await lambda.listFunctions();
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
