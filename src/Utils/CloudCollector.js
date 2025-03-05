const { EC2 } = require("@aws-sdk/client-ec2");
const { Lambda } = require("@aws-sdk/client-lambda");
const { RDS } = require("@aws-sdk/client-rds");
const { S3 } = require("@aws-sdk/client-s3");

const DL_access = require('../DataLake/DL_access');
const { IAM } = require("@aws-sdk/client-iam");



/// TBD: https://github.com/thiagosanches/awscraper/tree/main/scrapers has many more scrapers, e.g. glue jobs, Lambdas and more
/// TBD: map ECS / EKS workloads



// This function should interface with AWS's infrastructure and obtain a list of all provisioned elements - EC2, VPCs, SGs etc
// This function should be called at the start of the program
async function CollectAssets() {
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
        console.log("EC2 Instances count:", instanceList.length);

        // Get VPCs
        const vpcs = await ec2.describeVpcs();
        console.log("VPCs count:", vpcs.Vpcs.length);

        for (const vpc of vpcs.Vpcs) {
             DL_access.writeData('asset', 'VPC', vpc);
        }

        // Get S3 buckets
        const s3Buckets = await s3.listBuckets();
        for (const bucket of s3Buckets.Buckets) {
            DL_access.writeData('asset', 'S3Bucket', bucket);
        }
        console.log("S3 Buckets count:", s3Buckets.Buckets.length);

        // Get internet gateways
        const internetGateways = await ec2.describeInternetGateways();
        console.log("Internet Gateways count:", internetGateways.InternetGateways.length);
        for (const igw of internetGateways.InternetGateways) {
            DL_access.writeData('asset', 'IGW', igw);
        }

        // Get security groups
        const securityGroups = await ec2.describeSecurityGroups();
        console.log("Security Groups count:", securityGroups.SecurityGroups.length);
        for (const sg of securityGroups.SecurityGroups) {
            DL_access.writeData('asset', 'SG', sg);
        }

        // Get network interfaces
        const networkInterfaces = await ec2.describeNetworkInterfaces();
        console.log("Network Interfaces count:", networkInterfaces.NetworkInterfaces.length);
        for (const ni of networkInterfaces.NetworkInterfaces) {
            DL_access.writeData('asset', 'NI', ni);
        }

        // Get Lambda functions
        const lambdaFunctions = await lambda.listFunctions();
        //console.log("Lambda Functions:", lambdaFunctions.Functions);
        console.log("Lambda Functions count:", lambdaFunctions.Functions.length);  
        for (const lambdaFunction of lambdaFunctions.Functions) {
            DL_access.writeData('asset', 'Lambda', lambdaFunction);
        }

        // Get RDS instances
        const rdsInstances = await rds.describeDBInstances();
        //console.log("RDS Instances:", rdsInstances.DBInstances);
        console.log("RDS Instances count:", rdsInstances.DBInstances.length);


     
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

async function CollectRoles() {
    const iam = new IAM({
        region: 'us-east-1',
    });

    try {
        // Get IAM roles
        const roles = await iam.listRoles();
        console.log("IAM Roles count:", roles.Roles.length);
        for (const role of roles.Roles) {
            DL_access.writeData('asset', 'IAMRole', role);
        }
        return roles.Roles;
    } catch (error) {
        console.error("Error retrieving IAM roles:", error);
        throw error;
    }
}


module.exports = {
    CollectAssets, 
    CollectRoles
};
