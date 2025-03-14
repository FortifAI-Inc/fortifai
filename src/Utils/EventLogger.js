const { commonSchema, eventSchemas } = require('../DataLake/DL_S3_Logs_schema');
const { enqueueS3Write, fetchParquetFromS3 } = require('../DataLake/DL_S3_access');
const path = require('path');



async function logEvent(eventName, event) {
    switch (eventName) {
        case "TerminateInstances":
            //console.log("Terminate Instance event: ", event);
            const CloudTrailEvent = JSON.parse(event.CloudTrailEvent);
            const EventCommonData = {
                EventId: event.EventId,
                EventTime: event.EventTime,
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

    if (year != 2025) {
        console.log("ERROR: year is ",year,commonData)
    }
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
