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
