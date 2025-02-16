// flow_logs.js
const AWS = require('aws-sdk');

// This function should interface with AWS's infrastructure and obtain flow logs for all VPCs
async function collectFlowLogs() {
    console.log("Collecting flow logs...");
    const ec2 = new AWS.EC2();

    try {
        // Get VPCs
        const vpcs = await ec2.describeVpcs().promise();
        const vpcIds = vpcs.Vpcs.map(vpc => vpc.VpcId);

        // Get Flow Logs for each VPC
        for (const vpcId of vpcIds) {
            const flowLogs = await ec2.describeFlowLogs({ Filter: [{ Name: 'resource-id', Values: [vpcId] }] }).promise();
            console.log(`Flow Logs for VPC ${vpcId}:`, flowLogs.FlowLogs);
            getFlowLogs(flowLogs.FlowLogs[0].FlowLogId);
        }
    } catch (error) {
        console.error("Error collecting flow logs:", error);
    }
}

// This function should enable VPC flow logs for a given VPC
async function enableFlowLogs(vpcId) {
    console.log(`Enabling flow logs for VPC ${vpcId}...`);
    const ec2 = new AWS.EC2();

    try {
        const flowLog = await ec2.createFlowLogs({
            ResourceIds: [vpcId],
            ResourceType: 'VPC',
            TrafficType: 'ALL',
            DeliverLogsPermissionArn: 'arn:aws:iam::058264435853:role/OrganizationAccountAccessRole',
            LogDestination: 'arn:aws:logs:us-east-1:058264435853:log-group:MyLog',
            //LogGroupName: 'MyLog',
            MaxAggregationInterval: 60
        }).promise();
        console.log("Flow Log created:", flowLog);
    } catch (error) {
        console.error("Error enabling flow logs:", error);
    }
}
// This function receives FlowLogId as input and iterates over all log entries calling the parser for each in order to print the details
async function getFlowLogs(flowLogId) {
    console.log(`Retrieving flow logs for FlowLogId ${flowLogId}...`);
    const cloudwatchlogs = new AWS.CloudWatchLogs();

    try {
        const params = {
            logGroupName: 'MyLog',
            filterPattern: `{ $.flowLogId = "${flowLogId}" }`
        };

        const logEvents = await cloudwatchlogs.filterLogEvents(params).promise();
        logEvents.events.forEach(event => {
            const log = JSON.parse(event.message);
            const parsedLog = parseFlowLog(log);
            console.log(parsedLog);
        });
    } catch (error) {
        console.error("Error retrieving flow logs:", error);
    }
}

// This function should parse a flow log entry
function parseFlowLog(log) {
    // Function to parse a flow log entry
    const parsedLog = {
        timestamp: log.timestamp,
        sourceIP: log.sourceIP,
        destinationIP: log.destinationIP,
        bytesTransferred: log.bytesTransferred,
        action: log.action
    };
    return parsedLog;
}

function filterFlowLogs(logs, criteria) {
    // Function to filter flow logs based on given criteria
    return logs.filter(log => {
        let matches = true;
        for (let key in criteria) {
            if (log[key] !== criteria[key]) {
                matches = false;
                break;
            }
        }
        return matches;
    });
}

function aggregateFlowLogs(logs) {
    // Function to aggregate flow logs
    const aggregatedData = logs.reduce((acc, log) => {
        const key = `${log.sourceIP}-${log.destinationIP}`;
        if (!acc[key]) {
            acc[key] = {
                sourceIP: log.sourceIP,
                destinationIP: log.destinationIP,
                totalBytes: 0,
                count: 0
            };
        }
        acc[key].totalBytes += log.bytesTransferred;
        acc[key].count += 1;
        return acc;
    }, {});
    return Object.values(aggregatedData);
}

module.exports = {
    collectFlowLogs,
    enableFlowLogs,
    parseFlowLog,
    filterFlowLogs,
    aggregateFlowLogs
};
