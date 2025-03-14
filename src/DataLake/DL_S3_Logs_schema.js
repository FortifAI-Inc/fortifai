const parquet = require('parquetjs-lite');

const commonSchema = new parquet.ParquetSchema({
    EventId: { type: 'UTF8' },
    EventTime: { type: 'INT64'},//TIMESTAMP_MILLIS' },
    EventSource: { type: 'UTF8' },
    EventName: { type: 'UTF8' },
    awsRegion: { type: 'UTF8' },
    sourceIPAddress: { type: 'UTF8' },
    userAgent: { type: 'UTF8' },
    ReadOnly: { type: 'BOOLEAN' },
    eventType: { type: 'UTF8' },
    managementEvent: { type: 'BOOLEAN' },
    recipientAccountId: { type: 'UTF8' },
    eventCategory: { type: 'UTF8' },
    requestID: { type: 'UTF8' },
    userType: { type: 'UTF8' },               // IAMUser, AssumedRole, AWSService
    principalId: { type: 'UTF8' },            // AWS principal ID
    userArn: { type: 'UTF8' },                // ARN of the user making the request
    userName: { type: 'UTF8' },               // IAM username (if applicable)
    accessKeyId: { type: 'UTF8' },            // Access Key used for authentication
    accountId: { type: 'UTF8' },              // AWS Account ID of the user
    // **Session Context (If AssumedRole or Session-Based Events)**
    //TODO: understand this part better
    //sessionIssuerArn: { type: 'UTF8', optional: true },  // ARN of the session issuer
    //sessionIssuerType: { type: 'UTF8', optional: true }, // Type of session issuer (Role, User, etc.)
    //sessionIssuerPrincipalId: { type: 'UTF8', optional: true }, // Principal ID of session issuer
    //sessionCreationDate: { type: 'TIMESTAMP_MILLIS', optional: true }, // Session creation timestamp
    //mfaAuthenticated: { type: 'BOOLEAN', optional: true }, // Whether MFA was used
});


const eventSchemas = {
    RunInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8' },
        instanceType: { type: 'UTF8' },
        imageId: { type: 'UTF8' },
        privateIpAddress: { type: 'UTF8' },
        securityGroup: { type: 'UTF8' },
    }),
    AssumeRole: new parquet.ParquetSchema({
        EventId: { type: 'UTF8' },
        roleArn: { type: 'UTF8' },
        roleSessionName: { type: 'UTF8' },
        credentials: { type: 'UTF8' },
    }),
    TerminateInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8' },
        instanceId: { type: 'UTF8' }
    }),
    CreateBucket: new parquet.ParquetSchema({
        EventId: { type: 'UTF8' },
        bucketName: { type: 'UTF8' }
    }),
};

module.exports = { commonSchema, eventSchemas };