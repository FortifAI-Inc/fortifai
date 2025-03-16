const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { CloudTrailClient, LookupEventsCommand, PutEventSelectorsCommand } = require("@aws-sdk/client-cloudtrail");
const fs = require('fs');
const path = require('path');
const EventRegistration = require('./EventRegistration');
const EventLogger = require('./EventLogger')


async function getAllEvents() {
    const cloudTrail = new CloudTrailClient({ region: 'us-east-1' });
    let events = [];
    let uniqueEventNames = new Set();
    let eventCounts = {};

    let Attributes = EventRegistration.buildLookupAttributes()

    for (const attribute of Attributes) {
        //console.log("Retrieving event ", attribute.AttributeValue)
        let params = {
            LookupAttributes: [attribute],
            MaxResults: 50,
        };
        let EventAccumulator = []

        try {
            let data;
            let eventCountForThisAttribute = 0;
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
                if (data.Events) {
                    events = events.concat(data.Events);
                    EventAccumulator = EventAccumulator.concat(data.Events)
                    eventCountForThisAttribute += data.Events.length;
                    const eventName = attribute.AttributeValue;

                    //const eventFilePath = path.join(__dirname, `EventLogs/${eventName}.log`);
                    let eventLog = '';

                    for (const event of data.Events) {
                        //eventLog += `Event ID: ${event.EventId}\nEvent Time: ${event.EventTime}\nEvent Name: ${event.EventName}\nEvent Source: ${event.EventSource}\n\n${JSON.stringify(event, null, 2)}\n${'#'.repeat(80)}\n\n`;
                        //EventLogger.logEvent(eventName, event)
                    }

                    //if (!fs.existsSync(eventFilePath)) {
                    //    console.log("creating file ", eventFilePath)
                    //    fs.mkdirSync(path.dirname(eventFilePath), { recursive: true });
                    //    fs.writeFileSync(eventFilePath, '', 'utf8');
                    //}
                    //fs.appendFileSync(eventFilePath, eventLog, 'utf8');
                }
                params.NextToken = data.NextToken;
                await new Promise(resolve => setTimeout(resolve, 550))
            } while (data.NextToken);
            console.log(`Number of events received for ${attribute.AttributeValue}: ${eventCountForThisAttribute}`);
            console.log('Length of accumulated events is ', EventAccumulator.length)
            EventLogger.logEventBatch(attribute.AttributeValue, EventAccumulator)
            // Append summary to the beginning of each file
            //const eventFilePath = path.join(__dirname, `EventLogs/${attribute.AttributeValue}.log`);
            //const summaryLine = `Total number of ${attribute.AttributeValue} events: ${eventCountForThisAttribute}\n${'#'.repeat(80)}\n\n`;
            //const fileContent = fs.readFileSync(eventFilePath, 'utf8');
            //fs.writeFileSync(eventFilePath, summaryLine + fileContent, 'utf8');

        } catch (error) {
            console.error("Error retrieving events:", error);
        }
    }
}



async function startListening() {
        console.log("Listening for events...");
        await getAllEvents();
        //await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute before checking again
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
    startListening
};
