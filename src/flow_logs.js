// flow_logs.js


const { CloudWatchLogs } = require('@aws-sdk/client-cloudwatch-logs');
const { EC2 } = require('@aws-sdk/client-ec2');
const { S3 } = require('@aws-sdk/client-s3');

const zlib = require('zlib');
const dns = require('dns');
const llms_registry = require('./llms_registry');


// This function should interface with AWS's infrastructure and obtain flow logs for all VPCs
async function collectFlowLogs() {
    console.log("Collecting flow logs...");
    const ec2 = new EC2();

    try {
	getS3FlowLogs();
    } catch (error) {
        console.error("Error collecting flow logs:", error);
    }
}

// This function should enable VPC flow logs for a given VPC
async function enableFlowLogs(IfId) {
    console.log(`Enabling flow logs for Network Interface ${IfId}...`);
    const ec2 = new EC2();

    try {
        const flowLog = await ec2.createFlowLogs({
            ResourceIds: [IfId],
            ResourceType: 'NetworkInterface',
            TrafficType: 'ALL',
            //DeliverLogsPermissionArn: 'arn:aws:iam::058264435853:role/VPCFlowLogs-Cloudwatch-1739715485175',
            //LogDestination: 'arn:aws:logs:us-east-1:058264435853:log-group:MyLog',
            LogDestination: 'arn:aws:s3:::hilikloggerbucket',
	        LogDestinationType: 's3',
            //LogGroupName: 'MyLog',
            LogFormat: '${flow-direction} ${instance-id} ${interface-id} ${pkt-srcaddr} ${pkt-dstaddr} ${protocol} ${dstport} ${action}',

            MaxAggregationInterval: 60
        });
        console.log("Flow Log created:", flowLog);
    } catch (error) {
        console.error("Error enabling flow logs:", error);
    }
}
async function getS3FlowLogs() {
    console.log(`Retrieving flow logs from S3...`);
    const s3 = new S3();

    llms_registry.BuildRegistry();
    //llms_registry.listIPAddresses();
    try {
        const params = {
            Bucket: 'hilikloggerbucket',
            Prefix: `AWSLogs/058264435853/`
        };

        const data = await s3.listObjectsV2(params);
        for (const obj of data.Contents) {
            if (obj.Size === 0) { // skip directory
                continue
            }
            const objectData = await s3.getObject({ Bucket: params.Bucket, Key: obj.Key });
            const decompressedData = zlib.gunzipSync(objectData.Body);
            const logEntries = decompressedData.toString('utf-8').split('\n');
            const uniqueIPs = {}; // Global dictionary to store unique IP addresses

            logEntries.slice(1).forEach(entry => { // Skip the header line
                if (entry) {
                    const logParts = entry.split(' ');
                    const parsedLog = {
                        dir: logParts[0],
                        srcaddr: logParts[3],
                        dstaddr: logParts[4],
                        dstport: logParts[6],
                        protocol: logParts[5]
                    };
                    if (parsedLog.dir == "egress")  {
                        if (!uniqueIPs[parsedLog.dstaddr]) {
                            uniqueIPs[parsedLog.dstaddr] = true;
                            const hostname = llms_registry.lookupService(parsedLog.dstaddr);
                            if (hostname !== "unknown") {
                                console.log(`Identified connection to `, hostname);
                            }
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
    const cloudwatchlogs = new CloudWatchLogs();

    try {
        const params = {
            logGroupName: 'MyLog',
            filterPattern: `{ $.flowLogId = "${flowLogId}" }`
        };

        const logEvents = await cloudwatchlogs.filterLogEvents(params);
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
