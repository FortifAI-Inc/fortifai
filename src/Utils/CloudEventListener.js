const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { CloudTrailClient, LookupEventsCommand } = require("@aws-sdk/client-cloudtrail");

const logGroupName = 'your-log-group-name';
const logStreamName = 'your-log-stream-name';

async function logEvent(message) {
    const cloudWatchLogs = new CloudWatchLogs({
        region: 'us-east-1',
    });

    try {
        const params = {
            logGroupName,
            logStreamName,
            logEvents: [
                {
                    message: JSON.stringify(message),
                    timestamp: new Date().getTime(),
                },
            ],
        };

        await cloudWatchLogs.putLogEvents(params);
        console.log("Event logged successfully");
    } catch (error) {
        console.error("Error logging event:", error);
    }
}

async function listenForEvents() {
    const cloudTrail = new CloudTrailClient({ region: 'us-east-1' });

    try {
        const params = {
            LookupAttributes: [
                {
                    AttributeKey: 'EventName',
                    AttributeValue: 'ConsoleLogin',
                },
            ],
        };

        const data = await cloudTrail.send(new LookupEventsCommand(params));
        if (data.Events) {
            for (const event of data.Events) {
                const eventData = JSON.parse(event.CloudTrailEvent);
                const message = {
                    event: event.EventName,
                    accessKeyId: eventData.userIdentity.accessKeyId,
                    resources: eventData.resources,
                };
                await logEvent(message);
            }
        }
    } catch (error) {
        console.error("Error listening for events:", error);
    }
}

async function startListening() {
    while (true) {
        console.log("Listening for events...");
        await listenForEvents();
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute before checking again
    }
}

startListening();

module.exports = {
    logEvent,
    listenForEvents,
};
