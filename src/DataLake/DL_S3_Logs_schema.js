const parquet = require('parquetjs-lite');

const InventorySchema = new parquet.ParquetSchema({
    // Required Fields
    EventId: { type: 'UTF8', optional: false },
});


const CommonSchema = new parquet.ParquetSchema({
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
    userArn: { type: 'UTF8', optional: true }, // Some observability automatic rolwa trigger these without ARN
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


// Event Schemas 

const EventsSchemas = {
    // EC2
    TerminateInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instancesSet: { type: 'JSON', optional: false }
    }),
    RunInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instanceType: { type: 'UTF8', optional: false },
        instancesSet: { type: 'JSON', optional: false },
        keyName: { type: 'UTF8', optional: true },
        securityGroups: { type: 'UTF8', repeated: true, optional: true },
        subnetId: { type: 'UTF8', optional: true }
    }),
    TerminateInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instancesSet: { type: 'JSON', optional: false },
    }),
    ModifyInstanceAttribute: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instanceId: { type: 'UTF8', optional: false },
        attribute: { type: 'UTF8', optional: false },
        value: { type: 'UTF8', optional: true }
    }),
    StartInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instancesSet: { type: 'JSON', optional: false },
    }),
    StopInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instancesSet: { type: 'JSON', optional: false },
        force: { type: 'BOOLEAN', optional: true }
    }),
    RebootInstances: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instancesSet: { type: 'JSON', optional: false },
    }),
    CreateTags: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        resourcesSet: { type: 'JSON', optional: false },
        tagSet: { type: 'JSON', optional: false }
    }),
    DeleteTags: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        resourcesSet: { type: 'JSON', optional: false },
        tagKeys: { type: 'UTF8', repeated: true, optional: false }
    }),
    // S3
    PutObject: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        bucketName: { type: 'UTF8', optional: false },
        objectKey: { type: 'UTF8', optional: false },
        size: { type: 'INT64', optional: true },
        storageClass: { type: 'UTF8', optional: true }
    }),
    DeleteObject: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        bucketName: { type: 'UTF8', optional: false },
        objectKey: { type: 'UTF8', optional: false }
    }),
    CreateBucket: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        bucketName: { type: 'UTF8', optional: false },
        region: { type: 'UTF8', optional: true }
    }),
    DeleteBucket: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        bucketName: { type: 'UTF8', optional: false }
    }),
    PutBucketPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        bucketName: { type: 'UTF8', optional: false },
        policy: { type: 'JSON', optional: false }
    }),
    PutBucketAcl: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        bucketName: { type: 'UTF8', optional: false },
        acl: { type: 'JSON', optional: false }
    }),
    // Lambda
    CreateFunction20150331: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        runtime: { type: 'UTF8', optional: false },
        handler: { type: 'UTF8', optional: false },
        role: { type: 'UTF8', optional: false },
        codeSize: { type: 'INT64', optional: true },
        timeout: { type: 'INT32', optional: true },
        memorySize: { type: 'INT32', optional: true },
        environment: { type: 'JSON', optional: true },
        kmsKeyArn: { type: 'UTF8', optional: true },
        architectures: { type: 'UTF8', /*values:*/ repeated: true, optional: true }
    }),

    DeleteFunction20150331: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        qualifier: { type: 'UTF8', optional: true }
    }),

    UpdateFunctionCode20150331v2: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        dryRun: { type: 'BOOLEAN', optional: false },
        publish: { type: 'BOOLEAN', optional: false }
    }),

    UpdateFunctionConfiguration20150331v2: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true },
        timeout: { type: 'INT32', optional: true }
    }),

    Invoke20150331: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        invocationType: { type: 'UTF8', optional: false },
        qualifier: { type: 'UTF8', optional: true },
        payloadSize: { type: 'INT64', optional: false },
        logType: { type: 'UTF8', optional: true },
        clientContext: { type: 'UTF8', optional: true }
    }),


    CreateAlias20150331: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: false },
        functionVersion: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true }
    }),
    DeleteAlias20150331: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: false }
    }), 
    UpdateAlias20150331: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: false },
        functionVersion: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true }
    }),
    CreateEventSourceMapping: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        eventSourceArn: { type: 'UTF8', optional: false },
        batchSize: { type: 'INT32', optional: true },
        enabled: { type: 'BOOLEAN', optional: true },
        startingPosition: { type: 'UTF8', optional: true },
        startingPositionTimestamp: { type: 'INT64', optional: true },
        destinationConfig: { type: 'JSON', optional: true }
    }),
    DeleteEventSourceMapping: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        UUID: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false }
    }),

    UpdateEventSourceMapping: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        UUID: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        batchSize: { type: 'INT32', optional: true },
        enabled: { type: 'BOOLEAN', optional: true },
        startingPosition: { type: 'UTF8', optional: true },
        startingPositionTimestamp: { type: 'INT64', optional: true },
        destinationConfig: { type: 'JSON', optional: true }
    }),
    TagResource: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        resourceName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: false }
    }),
    UntagResource: new parquet.ParquetSchema({ //TODO not sure
        EventId: { type: 'UTF8', optional: false },
        resourceName: { type: 'UTF8', optional: false },
        tagKeys: { type: 'UTF8', /*values:*/ repeated: true, optional: false }
    }),
    PublishLayerVersion: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        layerName: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true },
        licenseInfo: { type: 'UTF8', optional: true },
        compatibleRuntimes: { type: 'UTF8', /*values:*/ repeated: true, optional: true }
    }), 
    DeleteLayerVersion: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        layerName: { type: 'UTF8', optional: false },
        versionNumber: { type: 'INT64', optional: false }
    }),
    PutProvisionedConcurrencyConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        qualifier: { type: 'UTF8', optional: true },
        provisionedConcurrency: { type: 'INT32', optional: false },
        requestedProvisionedConcurrency: { type: 'INT32', optional: false },
        status: { type: 'UTF8', optional: false },
        statusReason: { type: 'UTF8', optional: true }
    }),
    DeleteProvisionedConcurrencyConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        qualifier: { type: 'UTF8', optional: true }
    }),
    CreateCodeSigningConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        codeSigningConfigArn: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true },
        allowedPublishers: { type: 'JSON', optional: false },
        codeSigningPolicies: { type: 'JSON', optional: false }
    }),
    UpdateCodeSigningConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        codeSigningConfigArn: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true },
        allowedPublishers: { type: 'JSON', optional: false },
        codeSigningPolicies: { type: 'JSON', optional: false }
    }),
    DeleteCodeSigningConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        codeSigningConfigArn: { type: 'UTF8', optional: false }
    }), 
    PutFunctionEventInvokeConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        destinationConfig: { type: 'JSON', optional: false }
    }),
    DeleteFunctionEventInvokeConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false }
    }),
    //KMS
    CreateKey: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        keyId: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true },
        keyUsage: { type: 'UTF8', optional: true },
        keyState: { type: 'UTF8', optional: true },
        origin: { type: 'UTF8', optional: true },
        enabled: { type: 'BOOLEAN', optional: true },
        keySpec: { type: 'UTF8', optional: true },
        keyMaterialOrigin: { type: 'UTF8', optional: true },
        customerMasterKeySpec: { type: 'UTF8', optional: true },
        encryptionAlgorithms: { type: 'UTF8', /*values:*/ repeated: true, optional: true },
        signingAlgorithms: { type: 'UTF8', /*values:*/ repeated: true, optional: true }
    }),
    CreateAlias: new parquet.ParquetSchema({ // This is actually a KMS function
        EventId: { type: 'UTF8', optional: false },
        aliasName: { type: 'UTF8', optional: false },
        targetKeyId: { type: 'UTF8', optional: false },
    }),
    DeleteAlias: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        functionName: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: false }
    }),
    //IAM
    CreateUser: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: true }, // Root account doesn't have username
        path: { type: 'UTF8', optional: true },
        permissionsBoundary: { type: 'UTF8', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteUser: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: true }
    }),
    AttachRolePolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        roleName: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false }
    }),
    DetachRolePolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        roleName: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false }
    }),
    CreateRole: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        roleName: { type: 'UTF8', optional: false },
        assumeRolePolicyDocument: { type: 'JSON', optional: false },
        path: { type: 'UTF8', optional: true },
        permissionsBoundary: { type: 'UTF8', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteRole: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        roleName: { type: 'UTF8', optional: false }
    }),
    AssumeRole: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        roleArn: { type: 'UTF8', optional: false },
        roleSessionName: { type: 'UTF8', optional: false },
        externalId: { type: 'UTF8', optional: true },
        durationSeconds: { type: 'INT32', optional: true }
    }),
    AssumeRoleFailed: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        errorMessage: { type: 'UTF8', optional: false },
     }),

    CreateGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        displayName: { type: 'UTF8', optional: false },
        groupId: { type: 'UTF8', optional: true }, // TODO: it's inside "group" on the response
        path: { type: 'UTF8', optional: true }
    }),
    DeleteGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupName: { type: 'UTF8', optional: false }
    }),
    AddUserToGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupName: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false }
    }),
    RemoveUserFromGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupName: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false }
    }),
};


module.exports = { CommonSchema, EventsSchemas, InventorySchema };
