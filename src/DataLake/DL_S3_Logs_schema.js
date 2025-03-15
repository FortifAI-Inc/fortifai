const parquet = require('parquetjs-lite');

const commonSchema = new parquet.ParquetSchema({
    // Required Fields
    EventId: { type: 'UTF8', optional: false },
    EventTime: { type: 'INT64', optional: false },
    EventSource: { type: 'UTF8', optional: false },
    EventName: { type: 'UTF8', optional: false },
    eventCategory: { type: 'UTF8', optional: false },
    awsRegion: { type: 'UTF8', optional: false },
    managementEvent: { type: 'BOOLEAN', optional: false },
    recipientAccountId: { type: 'UTF8', optional: false },  
    requestID: { type: 'UTF8', optional: false },

    // Conditional Fields
    sourceIPAddress: { type: 'UTF8', optional: true },
    userAgent: { type: 'UTF8', optional: true },
    ReadOnly: { type: 'BOOLEAN', optional: true },
    eventType: { type: 'UTF8', optional: false },
    
    // Identity Fields
    userType: { type: 'UTF8', optional: false },
    principalId: { type: 'UTF8', optional: false },
    userArn: { type: 'UTF8', optional: false },
    accessKeyId: { type: 'UTF8', optional: true },
    userName: { type: 'UTF8', optional: true },               // IAM username (if applicable)
    accountId: { type: 'UTF8', optional: true },              // AWS Account ID of the user
    
    // Session Context (Conditional)
    sessionIssuerType: { type: 'UTF8', optional: true },
    sessionIssuerArn: { type: 'UTF8', optional: true },
    sessionIssuerPrincipalId: { type: 'UTF8', optional: true },
    sessionCreationTime: { type: 'INT64', optional: true },
    mfaAuthenticated: { type: 'BOOLEAN', optional: true },
    sourceIdentity: { type: 'UTF8', optional: true },
    
    // Security Context
    errorCode: { type: 'UTF8', optional: true },
    errorMessage: { type: 'UTF8', optional: true },
    tlsDetails: { type: 'UTF8', optional: true }
});


const eventSchemas = {
    TerminateInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8' },
        instanceId: { type: 'UTF8' }
    }),
};

module.exports = { commonSchema, eventSchemas };
/*    RunInstances: new parquet.ParquetSchema({
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
    CreateBucket: new parquet.ParquetSchema({
        EventId: { type: 'UTF8' },
        bucketName: { type: 'UTF8' }
    }),
*/