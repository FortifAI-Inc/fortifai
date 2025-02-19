// flow_logs.js
const AWS = require('aws-sdk');
const zlib = require('zlib');
const dns = require('dns');

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
            getS3FlowLogs(flowLogs.FlowLogs[0].FlowLogId);
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
            //DeliverLogsPermissionArn: 'arn:aws:iam::058264435853:role/VPCFlowLogs-Cloudwatch-1739715485175',
            //LogDestination: 'arn:aws:logs:us-east-1:058264435853:log-group:MyLog',
            LogDestination: 'arn:aws:s3:::hilikloggerbucket',
	        LogDestinationType: 's3',
            //LogGroupName: 'MyLog',
            LogFormat: '${flow-direction} ${instance-id} ${interface-id} ${pkt-srcaddr} ${pkt-dstaddr} ${protocol} ${dstport} ${action}',

            MaxAggregationInterval: 60
        }).promise();
        console.log("Flow Log created:", flowLog);
    } catch (error) {
        console.error("Error enabling flow logs:", error);
    }
}
async function getS3FlowLogs(flowLogId) {
    console.log(`Retrieving flow logs for FlowLogId ${flowLogId} from S3...`);
    const s3 = new AWS.S3();

    try {
        const params = {
            Bucket: 'hilikloggerbucket',
            //Prefix: `AWSLogs/${flowLogId}/`
            Prefix: `AWSLogs/058264435853/`
        };

        const data = await s3.listObjectsV2(params).promise();
        for (const obj of data.Contents) {
            if (obj.Size === 0) { // skip directory
                continue
            }
            const objectData = await s3.getObject({ Bucket: params.Bucket, Key: obj.Key }).promise();
            const decompressedData = zlib.gunzipSync(objectData.Body);
            const logEntries = decompressedData.toString('utf-8').split('\n');
            const uniqueIPs = {}; // Global dictionary to store unique IP addresses

            logEntries.slice(1).forEach(entry => { // Skip the header line
                if (entry) {
                    const logParts = entry.split(' ');
                    const parsedLog = {
                        dir: logparts[0]
                        srcaddr: logParts[4],
                        dstaddr: logParts[5],
                        dstport: logParts[7],
                        protocol: logParts[6]
                    };
                    if (parsedLog.dir == "egress")  {
                        if (!uniqueIPs[parsedLog.dstaddr]) {
                            uniqueIPs[parsedLog.dstaddr] = true;
                            dns.reverse(parsedLog.dstaddr, (err, hostnames) => {
                                if (err) {
                                    //console.error(`DNS lookup failed for ${parsedLog.dstaddr}:`, err);
                                } else {
                                    console.log(`DNS name for ${parsedLog.dstaddr}:`, hostnames[0]);
                                }
                            });
                        }
                        //console.log(parsedLog);
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error retrieving flow logs from S3:", error);
    }
}
async function getCloudWatchFlowLogs(flowLogId) {
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
