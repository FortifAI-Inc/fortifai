const { commonSchema, eventSchemas } = require('../DataLake/DL_S3_Logs_schema');
const { enqueueS3Write, fetchParquetFromS3 } = require('../DataLake/DL_S3_access');
const path = require('path');



async function logEvent(eventName, event) {
    // Parse CloudTrail event details
    const CloudTrailEvent = JSON.parse(event.CloudTrailEvent || '{}');
    const userIdentity = CloudTrailEvent.userIdentity || {};
    const sessionContext = userIdentity.sessionContext || {};
    const sessionAttributes = sessionContext.attributes || {};
    const sessionIssuer = sessionContext.sessionIssuer || {};

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
    //console.log(EventCommonData)
    return; 
    switch (eventName) {
        case "TerminateInstances":
            //console.log("Terminate Instance event: ", event);
            const CloudTrailEvent = JSON.parse(event.CloudTrailEvent);
            const EventCommonData = {
                EventId: event.EventId,
                EventTime: Number(event.EventTime),
                EventSource: event.EventSource,
                EventName: event.EventName,
                awsRegion: CloudTrailEvent.awsRegion,
                sourceIPAddress: CloudTrailEvent.sourceIPAddress,
                userAgent: CloudTrailEvent.userAgent,
                ReadOnly: event.ReadOnly,
                eventType: CloudTrailEvent.eventType,
                managementEvent: CloudTrailEvent.managementEvent,
                recipientAccountId: CloudTrailEvent.recipientAccountId,
                eventCategory: CloudTrailEvent.eventCategory,
                requestID: CloudTrailEvent.requestID,
                userType: CloudTrailEvent.userIdentity.type,
                principalId: CloudTrailEvent.userIdentity.principalId,
                userArn: CloudTrailEvent.userIdentity.arn,
                userName: CloudTrailEvent.userIdentity.userName,
                accessKeyId: event.AccessKeyId,
                accountId: CloudTrailEvent.userIdentity.accountId
            }
            const EventPrivateData = {
                EventId: event.EventId,
                instanceId: CloudTrailEvent.requestParameters.instancesSet.items[0].instanceId,
            }
            //console.log("EventCommonData: ", EventCommonData);
            //console.log("EventPrivateData: ", EventPrivateData);
            writeS3Log(commonSchema, EventCommonData, eventSchemas[eventName], EventPrivateData);
            break;
        default:
            console.log("Unknown event: ", event);
    }
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
            console.log("Event is already in the DB");
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


module.exports = {
    logEvent
}
