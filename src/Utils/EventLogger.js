const { CommonSchema, EventsSchemas, InventorySchema } = require('../DataLake/DL_S3_Logs_schema');
const { enqueueS3Write, fetchParquetFromS3 } = require('../DataLake/DL_S3_access');
const path = require('path');



async function logEvent(eventName, event) {
    // Parse CloudTrail event details
    const CloudTrailEvent = JSON.parse(event.CloudTrailEvent || '{}');
    const userIdentity = CloudTrailEvent.userIdentity || {};
    const sessionContext = userIdentity.sessionContext || {};
    const sessionAttributes = sessionContext.attributes || {};
    const sessionIssuer = sessionContext.sessionIssuer || {};
    //console.log("received event", eventName, "with object", event)

    // Build EventCommonData with schema compliance
    const EventCommonData = {
        // Required Fields (must always exist)
        EventId: event.EventId,
        EventTime: Number(event.EventTime),
        EventSource: event.EventSource,
        EventName: event.EventName,
        eventCategory: CloudTrailEvent.eventCategory || 'unknown',
        awsRegion: CloudTrailEvent.awsRegion || 'global',
        managementEvent: CloudTrailEvent.managementEvent || false,
        recipientAccountId: CloudTrailEvent.recipientAccountId || '',
        requestID: CloudTrailEvent.requestID || '',

        // Conditional Fields
        sourceIPAddress: CloudTrailEvent.sourceIPAddress || null,
        userAgent: CloudTrailEvent.userAgent || null,
        ReadOnly: event.ReadOnly !== undefined ? event.ReadOnly : null,
        eventType: CloudTrailEvent.eventType || 'AwsApiCall',

        // Identity Fields
        userType: userIdentity.type || 'Unknown',
        principalId: userIdentity.principalId || 'Unknown',
        userArn: userIdentity.arn || '',
        accessKeyId: event.AccessKeyId || userIdentity.accessKeyId || null,
        userName: userIdentity.userName || null,
        accountId: userIdentity.accountId || null,

        // Session Context
        sessionIssuerType: sessionIssuer.type || null,
        sessionIssuerArn: sessionIssuer.arn || null,
        sessionIssuerPrincipalId: sessionIssuer.principalId || null,
        sessionCreationTime: sessionAttributes.creationDate ?
            new Date(sessionAttributes.creationDate).getTime() : null,
        mfaAuthenticated: sessionAttributes.mfaAuthenticated === 'true',
        sourceIdentity: userIdentity.sourceIdentity || null,

        // Security Context
        errorCode: CloudTrailEvent.errorCode || null,
        errorMessage: CloudTrailEvent.errorMessage || null,
        tlsDetails: CloudTrailEvent.tlsDetails ?
            JSON.stringify(CloudTrailEvent.tlsDetails) : null
    };

    // Schema validation checks
    const requiredFields = [
        'EventId', 'EventTime', 'EventSource', 'EventName',
        'eventCategory', 'awsRegion', 'managementEvent',
        'recipientAccountId', 'requestID', 'userType',
        'principalId', 'eventType'
    ];

    for (const field of requiredFields) {
        if (!EventCommonData[field] && EventCommonData[field] !== false) {
            console.error(`Missing required field: ${field} in event ${event.EventName}`);
            EventCommonData[field] = 'MISSING_DATA'; // Ensure schema compliance
            console.log(event)
        }
    }

    // Handle special cases
    if (EventCommonData.userType === 'AWSService') {
        EventCommonData.userName = EventCommonData.userName || 'AWS Service';
        EventCommonData.accountId = EventCommonData.accountId || 'AWS';
    }
    if (eventName == "AssumeRole") { //Separate successful from failed attempt
        if (CloudTrailEvent.errorCode == "AccessDenied") {
            eventName = "AssumeRoleFailed" // collect different schema
        }
    }
    //console.log(EventCommonData)
    let EventPrivateData = {};
    try {
        EventPrivateData = {
            EventId: event.EventId,
            ...EventPrivateDataHandler(CloudTrailEvent, eventName)
            //...lambdaHandlers[eventName](CloudTrailEvent, eventName)
        };

        // Validate required fields
        const schema = EventsSchemas[eventName];
        //console.log("Schema is ", schema)
        //console.log("EventPrivateData is ",EventPrivateData)
        for (const field in schema.fields) {
            if (!schema.schema[field].optional && EventPrivateData[field] === undefined) {
                console.error(`Missing required field ${field} for ${eventName}`);
                console.log(event.CloudTrailEvent);
                EventPrivateData[field] = 'MISSING_DATA';
            }
        }
    } catch (error) {
        console.error(`Error processing ${eventName}:`, error);
        //console.error('schema is ', lambdaSchemas[eventName])
        EventPrivateData.error = error.message;
        return false;
    }
    //}
    writeS3Log(CommonSchema, EventCommonData, EventsSchemas[eventName], EventPrivateData);
    return true;
}

/**
 * Writes log data to S3 with partitioning based on timestamps.
 * @param {Object} commonSchema - Parquet schema for common fields.
 * @param {Object} commonData - JSON object matching the common schema.
 * @param {Object} eventSchema - Parquet schema for event-specific fields.
 * @param {Object} eventData - JSON object matching the event schema.
 */
async function writeS3Log(commonSchema, commonData, eventSchema, eventData) {
    const timestamp = new Date(commonData.EventTime);
    const year = String(timestamp.getUTCFullYear());
    const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const hour = String(timestamp.getUTCHours()).padStart(2, '0');
    const eventName = commonData.EventName;

    const partitionPath = path.join('EventLogger', year, month, day, hour);
    const commonFilePath = path.join(partitionPath, 'common.parquet');
    const eventFilePath = path.join(partitionPath, `${eventName}.parquet`);

    await writeS3Logs(commonSchema, commonData, commonFilePath);
    await writeS3Logs(eventSchema, eventData, eventFilePath);
}

async function writeS3Logs(schema, data, filePath) {
    try {
        let records = await fetchParquetFromS3(filePath);
        const index = records.findIndex(rec => rec.EventId === data.EventId);
        if (index !== -1) {
            //console.log("Event is already in the DB");
            return;
        } else {
            //console.log(`Adding new instance: ${ec2Data.InstanceId}`);
            records.push(data); // Insert new record
        }
        await enqueueS3Write(schema, records, filePath);
    } catch (err) {
        console.error(`Error writing log data to Parquet file:`, err);
    }
}

async function logEventBatch(eventName, events) { // This function should check out the eventId in the master directory and filter out events.
    try {
        let records = await fetchParquetFromS3('EventLogger/inventory.parquet');

        for (const event of events) {
            const index = records.findIndex(rec => rec.EventId === event.EventId);
            if (index !== -1) {
                // event exists, silently ignore
                //console.log("Event already in inventory")
                retval = await logEvent(eventName, event);

            } else {
                retval = await logEvent(eventName, event);
                if (retval == true) {
                    records.push({ EventId: event.EventId }); // Insert new record
                }
            }
        }
        await enqueueS3Write(InventorySchema, records, 'EventLogger/inventory.parquet');
    } catch (err) {
        console.error(`Error writing log data to Parquet file:`, err);
    }
}



module.exports = {
    logEvent,
    logEventBatch
}



// Generic private data extractor for events - 
// Will lookup the schema for the eventName, and if schema exists it will look for matching fields in both request and response
function EventPrivateDataHandler(cloudTrailEvent, eventName) {
    const req = cloudTrailEvent.requestParameters || {};
    let res = cloudTrailEvent.responseElements || {};
    const schema = EventsSchemas[eventName];

    if (schema === undefined) {
        console.error("EventPrivateDataHandler: No Schema defined for event ", eventName)
        return {}
    }
    if (eventName == "CreateKey") {
        res = res.keyMetadata; // ugly cornercase?
    }
    let ret = {}
    //console.log("Schema is ", schema)
    //console.log("EventPrivateData is ",EventPrivateData)
    for (const field in schema.fields) {
        if (req[field] != undefined) {
            ret[field] = req[field]
        } else if (res[field] != undefined) {
            ret[field] = res[field]
        } else if (cloudTrailEvent[field] != undefined) { // grab it from the top (AssumeRoleFailed)
            ret[field] = cloudTrailEvent[field]
        } else {
            //console.log("Res is ", res)
            for (const member in res) {
                //console.log("Member: ", member)
                //console.log("res[member] is ",res[member])
                //console.log("res[member][field] is ", res[member][field])
                if (res[member][field] != undefined) {
                    console.log("Found my field inside ", member)
                    ret[field] = res[member].field
                }
            }

        }
    }
    return (ret)

}

