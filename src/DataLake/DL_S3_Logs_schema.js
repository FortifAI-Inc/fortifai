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
    onBehalfOf: { type: 'JSON', optional: true },
    credentialId: {type: 'UTF8', optional: true },
    
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
    EnableSerialConsoleAccess: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        //instanceId: { type: 'UTF8', optional: false }
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
    AddMemberToGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupId: { type: 'UTF8', optional: false },
        member: { type: 'JSON', optional: false }
    }),
    RemoveMemberFromGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupName: { type: 'UTF8', optional: false },
        memberName: { type: 'UTF8', optional: false }
    }),
    AttachGroupPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupName: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false }
    }),
    DetachGroupPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupName: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false }
    }),
    CreatePolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        policyName: { type: 'UTF8', optional: false },
        policyDocument: { type: 'JSON', optional: false },
        description: { type: 'UTF8', optional: true }
    }),
    DeletePolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false }
    }),
    AttachUserPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false }
    }),
    DetachUserPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false }
    }),
    CreateInstanceProfile: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instanceProfileName: { type: 'UTF8', optional: false },
        path: { type: 'UTF8', optional: true }
    }),
    DeleteInstanceProfile: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instanceProfileName: { type: 'UTF8', optional: false }
    }),
    AddRoleToInstanceProfile: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instanceProfileName: { type: 'UTF8', optional: false },
        roleName: { type: 'UTF8', optional: false }
    }),
    RemoveRoleFromInstanceProfile: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instanceProfileName: { type: 'UTF8', optional: false },
        roleName: { type: 'UTF8', optional: false }
    }),
    AttachManagedPolicyToPermissionSet: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        permissionSetArn: { type: 'UTF8', optional: false },
        managedPolicyArn: { type: 'UTF8', optional: false }
    }),
    CompleteVirtualMfaDeviceRegistration: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        user: { type: 'JSON', optional: false },
        deviceId: { type: 'UTF8', optional: false }
    }),
    CreatePermissionSet: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true }
    }),
    CreatePolicyVersion: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        policyArn: { type: 'UTF8', optional: false },
        policyDocument: { type: 'JSON', optional: false },
        setAsDefault: { type: 'BOOLEAN', optional: true }
    }),
    DeleteAccessKey: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        accessKeyId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: true }
    }),
    DeleteLoginProfile: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false }
    }),
    DeleteMfaDeviceForUser: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        user: { type: 'JSON', optional: false },
        deviceId: { type: 'UTF8', optional: false }
    }),
    DeleteUserPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false },
        policyName: { type: 'UTF8', optional: false }
    }),
    DisassociateProfile: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        instanceArn: { type: 'UTF8', optional: false }
    }),
    EnableMFADevice: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false },
        serialNumber: { type: 'UTF8', optional: false },
        authenticationCode1: { type: 'UTF8', optional: true },
        authenticationCode2: { type: 'UTF8', optional: true }
    }),
    GenerateCredentialReport: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        reportFormat: { type: 'UTF8', optional: true }
    }),
    PutMfaDeviceManagementForDirectory: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        directoryId: { type: 'UTF8', optional: false },
        instanceArn: { type: 'UTF8', optional: false }
    }),
    PutUserPermissionsBoundary: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false },
        permissionsBoundary: { type: 'UTF8', optional: false }
    }),
    PutUserPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        userName: { type: 'UTF8', optional: false },
        policyName: { type: 'UTF8', optional: false },
        policyDocument: { type: 'JSON', optional: false }
    }),
    
    // Organizations
    InviteAccountToOrganization: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        accountId: { type: 'UTF8', optional: false },
        email: { type: 'UTF8', optional: true },
        notes: { type: 'UTF8', optional: true },
        status: { type: 'UTF8', optional: true }
    }),
    RemoveAccountFromOrganization: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        accountId: { type: 'UTF8', optional: false }
    }),
    CreateOrganization: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        featureSet: { type: 'UTF8', optional: true }
    }),
    DeleteOrganization: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false }
    }),
    EnableAWSServiceAccess: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        servicePrincipal: { type: 'UTF8', optional: false }
    }),
    DisableAWSServiceAccess: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        servicePrincipal: { type: 'UTF8', optional: false }
    }),
    EnableAllFeatures: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false }
    }),
    DisableAllFeatures: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false }
    }),
    EnablePolicyType: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        rootId: { type: 'UTF8', optional: false },
        policyType: { type: 'UTF8', optional: false }
    }),
    DisablePolicyType: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        rootId: { type: 'UTF8', optional: false },
        policyType: { type: 'UTF8', optional: false }
    }),
    AttachPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        policyId: { type: 'UTF8', optional: false },
        targetId: { type: 'UTF8', optional: false }
    }),
    DetachPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        policyId: { type: 'UTF8', optional: false },
        targetId: { type: 'UTF8', optional: false }
    }),
    ListPoliciesForTarget: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        targetId: { type: 'UTF8', optional: false },
        filter: { type: 'UTF8', optional: true }
    }),
    ListTargetsForPolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        policyId: { type: 'UTF8', optional: false }
    }),
    UpdatePolicy: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        policyId: { type: 'UTF8', optional: false },
        policyContent: { type: 'JSON', optional: false },
        description: { type: 'UTF8', optional: true }
    }),
    CreateAccount: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        accountName: { type: 'UTF8', optional: false },
        email: { type: 'UTF8', optional: false },
        roleName: { type: 'UTF8', optional: true },
        iamUserAccessToBilling: { type: 'UTF8', optional: true }
    }),
    DeleteAccount: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        accountId: { type: 'UTF8', optional: false }
    }),
    UpdateOrganizationalUnit: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        organizationalUnitId: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: true }
    }),
    CreateOrganizationalUnit: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        organizationalUnitName: { type: 'UTF8', optional: false },
        parentId: { type: 'UTF8', optional: false }
    }),
    DeleteOrganizationalUnit: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        organizationalUnitId: { type: 'UTF8', optional: false }
    }),
    MoveAccount: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        accountId: { type: 'UTF8', optional: false },
        sourceParentId: { type: 'UTF8', optional: false },
        destinationParentId: { type: 'UTF8', optional: false }
    }),
    //VPC
    CreateVpc: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        vpcId: { type: 'UTF8', optional: false },
        cidrBlock: { type: 'UTF8', optional: false },
        isDefault: { type: 'BOOLEAN', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteVpc: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        vpcId: { type: 'UTF8', optional: false }
    }),
    CreateSubnet: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        subnetId: { type: 'UTF8', optional: false },
        vpcId: { type: 'UTF8', optional: false },
        cidrBlock: { type: 'UTF8', optional: false },
        availabilityZone: { type: 'UTF8', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteSubnet: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        subnetId: { type: 'UTF8', optional: false }
    }),
    CreateSecurityGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupId: { type: 'UTF8', optional: false },
        groupName: { type: 'UTF8', optional: false },
        vpcId: { type: 'UTF8', optional: true },
        groupDescription: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteSecurityGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupId: { type: 'UTF8', optional: false }
    }),
    AuthorizeSecurityGroupIngress: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupId: { type: 'UTF8', optional: false },
        ipPermissions: { type: 'JSON', optional: false }
    }),
    AuthorizeSecurityGroupEgress: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        groupId: { type: 'UTF8', optional: false },
        ipPermissions: { type: 'JSON', optional: false }
    }),
    AttachInternetGateway: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        internetGatewayId: { type: 'UTF8', optional: false },
        vpcId: { type: 'UTF8', optional: false }
    }),
    CreateInternetGateway: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        internetGatewayId: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    CreateRoute: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        routeTableId: { type: 'UTF8', optional: false },
        destinationCidrBlock: { type: 'UTF8', optional: false },
        gatewayId: { type: 'UTF8', optional: true },
        instanceId: { type: 'UTF8', optional: true },
        natGatewayId: { type: 'UTF8', optional: true },
        transitGatewayId: { type: 'UTF8', optional: true }
    }),
    ReplaceRoute: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        routeTableId: { type: 'UTF8', optional: false },
        destinationCidrBlock: { type: 'UTF8', optional: false },
        gatewayId: { type: 'UTF8', optional: true },
        instanceId: { type: 'UTF8', optional: true },
        natGatewayId: { type: 'UTF8', optional: true },
        transitGatewayId: { type: 'UTF8', optional: true }
    }),
    AutomatedDefaultVpcCreation: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        vpcId: { type: 'UTF8', optional: true },
        isDefault: { type: 'BOOLEAN', optional: true },
        cidrBlock: { type: 'UTF8', optional: true },
        ARN: { type: 'UTF8', optional: true }, // TODO: hiding in resources
        tags: { type: 'JSON', optional: true }
    }),
    ModifyNetworkInterfaceAttribute: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        networkInterfaceId: { type: 'UTF8', optional: false },
        description: { type: 'JSON', optional: true },
        sourceDestCheck: { type: 'BOOLEAN', optional: true },
        groups: { type: 'UTF8', repeated: true, optional: true }
    }),
    DetachNetworkInterface: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        attachmentId: { type: 'UTF8', optional: false },
        networkInterfaceId: { type: 'UTF8', optional: true },
        instanceId: { type: 'UTF8', optional: true },
        force: { type: 'BOOLEAN', optional: true }
    }),
    // Misc
    RegisterRegion: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        awsRegion: { type: 'UTF8', optional: false }
    }),
    // Authentication
    Authenticate: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
    }),
    CredentialChallenge: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        additionalEventData: { type: 'JSON', optional: false }
    }),
    CredentialVerification: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        additionalEventData: { type: 'JSON', optional: false }
    }),
    Federate: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        serviceEventDetails: { type: 'JSON', optional: false }
    }),
    // CloudWatch
    StartLiveTail: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        logGroupIdentifiers: { type: 'UTF8', optional: true },
        logStreamIdentifiers: { type: 'UTF8', optional: true }
    }),
    StopLiveTail: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        sessionId: { type: 'UTF8', optional: false },
    }),
    // DynamoDB
    PutItem: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        tableName: { type: 'UTF8', optional: false },
        item: { type: 'JSON', optional: false },
        conditionExpression: { type: 'UTF8', optional: true },
        returnValues: { type: 'UTF8', optional: true }
    }),
    UpdateItem: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        tableName: { type: 'UTF8', optional: false },
        key: { type: 'JSON', optional: false },
        updateExpression: { type: 'UTF8', optional: false },
        conditionExpression: { type: 'UTF8', optional: true },
        returnValues: { type: 'UTF8', optional: true }
    }),
    DeleteItem: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        tableName: { type: 'UTF8', optional: false },
        key: { type: 'JSON', optional: false },
        conditionExpression: { type: 'UTF8', optional: true },
        returnValues: { type: 'UTF8', optional: true }
    }),
    CreateTable: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        tableName: { type: 'UTF8', optional: false },
        attributeDefinitions: { type: 'JSON', optional: false },
        keySchema: { type: 'JSON', optional: false },
        provisionedThroughput: { type: 'JSON', optional: true },
        globalSecondaryIndexes: { type: 'JSON', optional: true },
        localSecondaryIndexes: { type: 'JSON', optional: true }
    }),
    DeleteTable: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        tableName: { type: 'UTF8', optional: false }
    }),
    UpdateTable: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        tableName: { type: 'UTF8', optional: false },
        provisionedThroughput: { type: 'JSON', optional: true },
        globalSecondaryIndexUpdates: { type: 'JSON', optional: true },
        attributeDefinitions: { type: 'JSON', optional: true }
    }),
    // RDS
    CreateDBInstance: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbInstanceIdentifier: { type: 'UTF8', optional: false },
        dbInstanceClass: { type: 'UTF8', optional: false },
        engine: { type: 'UTF8', optional: false },
        allocatedStorage: { type: 'INT32', optional: true },
        masterUsername: { type: 'UTF8', optional: true },
        dbSecurityGroups: { type: 'UTF8', repeated: true, optional: true },
        vpcSecurityGroups: { type: 'UTF8', repeated: true, optional: true },
        availabilityZone: { type: 'UTF8', optional: true },
        dbSubnetGroup: { type: 'UTF8', optional: true },
        preferredMaintenanceWindow: { type: 'UTF8', optional: true },
        backupRetentionPeriod: { type: 'INT32', optional: true },
        multiAZ: { type: 'BOOLEAN', optional: true },
        engineVersion: { type: 'UTF8', optional: true },
        autoMinorVersionUpgrade: { type: 'BOOLEAN', optional: true },
        licenseModel: { type: 'UTF8', optional: true },
        storageType: { type: 'UTF8', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteDBInstance: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbInstanceIdentifier: { type: 'UTF8', optional: false },
        skipFinalSnapshot: { type: 'BOOLEAN', optional: true },
        finalDBSnapshotIdentifier: { type: 'UTF8', optional: true }
    }),
    ModifyDBInstance: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbInstanceIdentifier: { type: 'UTF8', optional: false },
        allocatedStorage: { type: 'INT32', optional: true },
        dbInstanceClass: { type: 'UTF8', optional: true },
        engineVersion: { type: 'UTF8', optional: true },
        applyImmediately: { type: 'BOOLEAN', optional: true },
        backupRetentionPeriod: { type: 'INT32', optional: true },
        multiAZ: { type: 'BOOLEAN', optional: true },
        preferredMaintenanceWindow: { type: 'UTF8', optional: true },
        autoMinorVersionUpgrade: { type: 'BOOLEAN', optional: true },
        storageType: { type: 'UTF8', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    CreateDBCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbClusterIdentifier: { type: 'UTF8', optional: false },
        engine: { type: 'UTF8', optional: false },
        masterUsername: { type: 'UTF8', optional: true },
        masterUserPassword: { type: 'UTF8', optional: true },
        vpcSecurityGroups: { type: 'UTF8', repeated: true, optional: true },
        dbSubnetGroup: { type: 'UTF8', optional: true },
        preferredBackupWindow: { type: 'UTF8', optional: true },
        backupRetentionPeriod: { type: 'INT32', optional: true },
        engineVersion: { type: 'UTF8', optional: true },
        port: { type: 'INT32', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteDBCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbClusterIdentifier: { type: 'UTF8', optional: false },
        skipFinalSnapshot: { type: 'BOOLEAN', optional: true },
        finalDBSnapshotIdentifier: { type: 'UTF8', optional: true }
    }),
    ModifyDBCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbClusterIdentifier: { type: 'UTF8', optional: false },
        newDBClusterIdentifier: { type: 'UTF8', optional: true },
        backupRetentionPeriod: { type: 'INT32', optional: true },
        preferredBackupWindow: { type: 'UTF8', optional: true },
        preferredMaintenanceWindow: { type: 'UTF8', optional: true },
        engineVersion: { type: 'UTF8', optional: true },
        applyImmediately: { type: 'BOOLEAN', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    //CloudWatch
    PutMetricData: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        namespace: { type: 'UTF8', optional: false },
        metricData: { type: 'JSON', optional: false }
    }),
    DeleteAlarms: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        alarmNames: { type: 'UTF8', repeated: true, optional: false }
    }),
    SetAlarmState: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        alarmName: { type: 'UTF8', optional: false },
        stateValue: { type: 'UTF8', optional: false },
        stateReason: { type: 'UTF8', optional: false },
        stateReasonData: { type: 'JSON', optional: true }
    }),
    PutDashboard: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dashboardName: { type: 'UTF8', optional: false },
        dashboardBody: { type: 'JSON', optional: false }
    }),
    DeleteDashboards: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dashboardNames: { type: 'UTF8', repeated: true, optional: false }
    }),
};
// CloudWatch Metrics and Alarms


module.exports = { CommonSchema, EventsSchemas, InventorySchema };
