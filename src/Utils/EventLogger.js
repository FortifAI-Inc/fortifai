const { commonSchema, eventSchemas, lambdaSchemas } = require('../DataLake/DL_S3_Logs_schema');
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
    //console.log(EventCommonData)
    let EventPrivateData = {};
    switch (eventName) {
        case "TerminateInstances":
            //console.log("Terminate Instance event: ", event);
            EventPrivateData = {
                EventId: event.EventId,
                instanceId: CloudTrailEvent.requestParameters.instancesSet.items[0].instanceId,
            }
            //console.log("EventCommonData: ", EventCommonData);
            //console.log("EventPrivateData: ", EventPrivateData);
            writeS3Log(commonSchema, EventCommonData, eventSchemas[eventName], EventPrivateData);
            break;
        // Lambda related events:
        case "CreateFunction20150331":
        case "DeleteFunction":
        case "UpdateFunctionCode":
        case "InvokeFunction":
        case "CreateAlias":
        case "DeleteAlias":
        case "UpdateFunctionCode20150331v2":
        case "UpdateFunctionConfiguration20150331v2":
            if (lambdaHandlers[eventName]) {
                try {
                    EventPrivateData = {
                        EventId: event.EventId,
                        ...lambdaHandlers[eventName](CloudTrailEvent)
                    };

                    // Validate required fields
                    const schema = lambdaSchemas[eventName];
                    //console.log("Schema is ", schema)
                    //console.log("EventPrivateData is ",EventPrivateData)
                    for (const field in schema.fields) {
                        if (!schema.schema[field].optional && !EventPrivateData[field]) {
                            console.error(`Missing required field ${field} for ${eventName}`);
                            console.log(event.CloudTrailEvent)
                            EventPrivateData[field.name] = 'MISSING_DATA';
                        }
                    }
                } catch (error) {
                    console.error(`Error processing ${eventName}:`, error);
                    EventPrivateData.error = error.message;
                }
            }
            writeS3Log(commonSchema, EventCommonData, lambdaSchemas[eventName], EventPrivateData);
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



const lambdaHandlers = { // data extractors for Lambda related events
    CreateFunction20150331: (cloudTrailEvent) => {
        const req = cloudTrailEvent.requestParameters || {};
        const res = cloudTrailEvent.responseElements || {};
        return {
            functionName: req.functionName,
            runtime: req.runtime,
            handler: req.handler,
            role: req.role,
            codeSize: res.codeSize,
            timeout: req.timeout || null,
            memorySize: req.memorySize || null,
            environment: req.environment?.variables ?
                JSON.stringify(req.environment.variables) : null,
            kmsKeyArn: req.kmsKeyArn || null,
            architectures: req.architectures || ['x86_64']
        };
    },
    UpdateFunctionCode20150331v2: (cloudTrailEvent) => ({
        functionName: cloudTrailEvent.requestParameters.functionName,
        publish: cloudTrailEvent.requestParameters.publish,
        dryRun: cloudTrailEvent.requestParameters.dryRun
    }),

    UpdateFunctionConfiguration20150331v2: (cloudTrailEvent) => ({
        functionName: cloudTrailEvent.requestParameters.functionName,
        description: cloudTrailEvent.requestParameters.description,
        timeout: cloudTrailEvent.requestParameters.timeout
    }),

    DeleteFunction: (cloudTrailEvent) => ({
        functionName: cloudTrailEvent.requestParameters.functionName,
        qualifier: cloudTrailEvent.requestParameters.qualifier || null
    }),

    UpdateFunctionCode: (cloudTrailEvent) => {
        const req = cloudTrailEvent.requestParameters || {};
        const res = cloudTrailEvent.responseElements || {};
        return {
            functionName: req.functionName,
            revisionId: res.revisionId,
            codeSha256: res.codeSha256,
            codeSize: res.codeSize,
            publish: req.publish || false
        };
    },

    InvokeFunction: (cloudTrailEvent) => {
        const req = cloudTrailEvent.requestParameters || {};
        return {
            functionName: req.functionName,
            invocationType: req.invocationType || 'RequestResponse',
            qualifier: req.qualifier || '$LATEST',
            payloadSize: req.payload?.length || 0,
            logType: req.logType || null,
            clientContext: req.clientContext || null
        };
    },

    CreateAlias: (cloudTrailEvent) => {
        const req = cloudTrailEvent.requestParameters || {};
        //console.log("Request Parameters are ", req)
        //console.log("cloudTrailEvent is ", cloudTrailEvent)
        return {
            aliasName: req.aliasName,
            targetKeyId: req.targetKeyId,
        };
    },

    DeleteAlias: (cloudTrailEvent) => ({
        functionName: cloudTrailEvent.requestParameters.functionName,
        name: cloudTrailEvent.requestParameters.name
    })
};
