const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { CloudTrailClient, LookupEventsCommand, PutEventSelectorsCommand } = require("@aws-sdk/client-cloudtrail");
const fs = require('fs');
const path = require('path');
const EventRegistration = require('./EventRegistration');

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

async function getAllEvents() {
    const cloudTrail = new CloudTrailClient({ region: 'us-east-1' });
    let events = [];
    let uniqueEventNames = new Set();
    let eventCounts = {};

    let Attributes = EventRegistration.buildLookupAttributes()

    for (const attribute of Attributes) {
        console.log("Retrieving event ", attribute.AttributeValue)
        let params = {
            LookupAttributes: [attribute],
            //StartTime: new Date(new Date().getTime() - 1000 * 60 * 60 * 24), // 24 hours ago
            MaxResults: 50,
        };

        try {
            let data;
            do {
                try {
                    data = await cloudTrail.send(new LookupEventsCommand(params));
                } catch (error) {
                    if (error.name === 'ThrottlingException') {
                        console.warn("ThrottlingException encountered, continuing...");
                        await new Promise(resolve => setTimeout(resolve, 1000))
                        continue;
                    } else {
                        throw error;
                    }
                }
                console.log(`Number of received events so far: `, events.length);
                if (data.Events) {
                    events = events.concat(data.Events);
                    const eventName = attribute.AttributeValue;
                    uniqueEventNames.add(eventName);
                    eventCounts[eventName] = (eventCounts[eventName] || 0) + data.Events.length;

                    const eventFilePath = path.join(__dirname, `EventLogs/${eventName}.log`);
                    let eventLog = '';

                    for (const event of data.Events) {
                        eventLog += `Event ID: ${event.EventId}\nEvent Time: ${event.EventTime}\nEvent Name: ${event.EventName}\nEvent Source: ${event.EventSource}\n\n${JSON.stringify(event, null, 2)}\n${'#'.repeat(80)}\n\n`;
                    }

                    if (!fs.existsSync(eventFilePath)) {
                        console.log("creating file ", eventFilePath)
                        fs.mkdirSync(path.dirname(eventFilePath), { recursive: true });
                        fs.writeFileSync(eventFilePath, '', 'utf8');
                    }
                    fs.appendFileSync(eventFilePath, eventLog, 'utf8');
                }
                params.NextToken = data.NextToken;
                await new Promise(resolve => setTimeout(resolve, 550))
            } while (data.NextToken);
            // Append summary to the beginning of each file
            for (const eventName of uniqueEventNames) {
                const eventFilePath = path.join(__dirname, `EventLogs/${eventName}.log`);
                const summaryLine = `Total number of ${eventName} events: ${eventCounts[eventName]}\n${'#'.repeat(80)}\n\n`;
                const fileContent = fs.readFileSync(eventFilePath, 'utf8');
                fs.writeFileSync(eventFilePath, summaryLine + fileContent, 'utf8');
            }

            console.log(`Total number of events: ${events.length}`);
            console.log(`Unique event names: ${Array.from(uniqueEventNames).join(', ')}`);
            console.log(`Event counts: ${JSON.stringify(eventCounts, null, 2)}`);
        } catch (error) {
            console.error("Error retrieving events:", error);
        }
    }
}
async function listenForEvents() {
    const cloudTrail = new CloudTrailClient({ region: 'us-east-1' });

    try {
        const params = {
            LookupAttributes: [
                /*{
                    AttributeKey: 'EventName',
                    AttributeValue: 'ConsoleLogin',
                },*/
            ],
            MaxResults: 100,
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
                console.log(message);//await logEvent(message);
            }
        }
    } catch (error) {
        console.error("Error listening for events:", error);
    }
}

async function startListening() {
    while (true) {
        console.log("Listening for events...");
        await getAllEvents();
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute before checking again
    }
}

//startListening();
function logEvent(message) {

    console.log("Logging event:", message);
    return;
    const cloudWatchLogs = new CloudWatchLogs({
        region: 'us-east-1',
    });

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

    cloudWatchLogs.putLogEvents(params, (err, data) => {
        if (err) {
            console.error("Error logging event:", err);
        } else {
            console.log("Event logged successfully:", data);
        }
    });
}


module.exports = {
    logEvent,
    listenForEvents,
    startListening
};
