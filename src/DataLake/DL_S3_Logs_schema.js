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
    credentialId: { type: 'UTF8', optional: true },

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
    DeleteKeyPair: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        keyPairId: { type: 'UTF8', optional: false }
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
    PutBucketEncryption: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        bucketName: { type: 'UTF8', optional: false },
        ServerSideEncryptionConfiguration: { type: 'JSON', optional: false }
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
    // SNS
    CreateTopic: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        topicArn: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: true },
        attributes: { type: 'JSON', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteTopic: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        topicArn: { type: 'UTF8', optional: false }
    }),
    Subscribe: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        topicArn: { type: 'UTF8', optional: false },
        protocol: { type: 'UTF8', optional: false },
        endpoint: { type: 'UTF8', optional: true },
        attributes: { type: 'JSON', optional: true }
    }),
    Unsubscribe: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        subscriptionArn: { type: 'UTF8', optional: false }
    }),
    Publish: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        topicArn: { type: 'UTF8', optional: true },
        targetArn: { type: 'UTF8', optional: true },
        message: { type: 'UTF8', optional: false },
        subject: { type: 'UTF8', optional: true },
        messageAttributes: { type: 'JSON', optional: true }
    }),
    //SQS
    CreateQueue: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        queueUrl: { type: 'UTF8', optional: false },
        queueName: { type: 'UTF8', optional: true },
        attributes: { type: 'JSON', optional: true }
    }),
    DeleteQueue: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        queueUrl: { type: 'UTF8', optional: false }
    }),
    SendMessage: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        queueUrl: { type: 'UTF8', optional: false },
        messageBody: { type: 'UTF8', optional: false },
        delaySeconds: { type: 'INT32', optional: true },
        messageAttributes: { type: 'JSON', optional: true }
    }),
    DeleteMessage: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        queueUrl: { type: 'UTF8', optional: false },
        receiptHandle: { type: 'UTF8', optional: false }
    }),
    PurgeQueue: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        queueUrl: { type: 'UTF8', optional: false }
    }),
    // ECS
    CreateCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        settings: { type: 'JSON', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false }
    }),
    UpdateService: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        serviceName: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        desiredCount: { type: 'INT32', optional: true },
        taskDefinition: { type: 'UTF8', optional: true },
        deploymentConfiguration: { type: 'JSON', optional: true }
    }),
    RunTask: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        taskDefinition: { type: 'UTF8', optional: false },
        overrides: { type: 'JSON', optional: true },
        count: { type: 'INT32', optional: true },
        startedBy: { type: 'UTF8', optional: true }
    }),
    StopTask: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        taskId: { type: 'UTF8', optional: false },
        reason: { type: 'UTF8', optional: true }
    }),
    RegisterTaskDefinition: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        family: { type: 'UTF8', optional: false },
        containerDefinitions: { type: 'JSON', optional: false },
        taskRoleArn: { type: 'UTF8', optional: true },
        executionRoleArn: { type: 'UTF8', optional: true },
        networkMode: { type: 'UTF8', optional: true },
        volumes: { type: 'JSON', optional: true },
        placementConstraints: { type: 'JSON', optional: true },
        requiresCompatibilities: { type: 'UTF8', repeated: true, optional: true }
    }),
    // EKS
    CreateCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        version: { type: 'UTF8', optional: true },
        roleArn: { type: 'UTF8', optional: false },
        resourcesVpcConfig: { type: 'JSON', optional: false },
        logging: { type: 'JSON', optional: true },
        tags: { type: 'JSON', repeated: true, optional: true }
    }),
    DeleteCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false }
    }),
    UpdateClusterConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        resourcesVpcConfig: { type: 'JSON', optional: true },
        logging: { type: 'JSON', optional: true }
    }),
    CreateNodegroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        nodegroupName: { type: 'UTF8', optional: false },
        scalingConfig: { type: 'JSON', optional: false },
        subnets: { type: 'UTF8', repeated: true, optional: false },
        instanceTypes: { type: 'UTF8', repeated: true, optional: true },
        amiType: { type: 'UTF8', optional: true },
        remoteAccess: { type: 'JSON', optional: true },
        nodeRole: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteNodegroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        nodegroupName: { type: 'UTF8', optional: false }
    }),
    UpdateNodegroupConfig: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        nodegroupName: { type: 'UTF8', optional: false },
        scalingConfig: { type: 'JSON', optional: true },
        labels: { type: 'JSON', optional: true },
        taints: { type: 'JSON', optional: true }
    }),
    // CloudFormation
    CreateStack: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        stackName: { type: 'UTF8', optional: false },
        templateBody: { type: 'JSON', optional: true },
        templateURL: { type: 'UTF8', optional: true },
        parameters: { type: 'JSON', repeated: true, optional: true },
        capabilities: { type: 'UTF8', repeated: true, optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteStack: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        stackName: { type: 'UTF8', optional: false }
    }),
    UpdateStack: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        stackName: { type: 'UTF8', optional: false },
        templateBody: { type: 'JSON', optional: true },
        templateURL: { type: 'UTF8', optional: true },
        parameters: { type: 'JSON', optional: true },
        capabilities: { type: 'UTF8', repeated: true, optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    CreateChangeSet: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        stackName: { type: 'UTF8', optional: false },
        changeSetName: { type: 'UTF8', optional: false },
        templateBody: { type: 'JSON', optional: true },
        templateURL: { type: 'UTF8', optional: true },
        parameters: { type: 'JSON', optional: true },
        capabilities: { type: 'UTF8', repeated: true, optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    ExecuteChangeSet: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        changeSetName: { type: 'UTF8', optional: false },
        stackName: { type: 'UTF8', optional: false }
    }),
    RollbackStack: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        stackName: { type: 'UTF8', optional: false },
        reason: { type: 'UTF8', optional: true }
    }),
    // Kinesis
    CreateStream: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        streamName: { type: 'UTF8', optional: false },
        shardCount: { type: 'INT32', optional: true }
    }),
    DeleteStream: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        streamName: { type: 'UTF8', optional: false }
    }),
    PutRecord: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        streamName: { type: 'UTF8', optional: false },
        data: { type: 'UTF8', optional: false },
        partitionKey: { type: 'UTF8', optional: false }
    }),
    PutRecords: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        streamName: { type: 'UTF8', optional: false },
        records: { type: 'JSON', optional: false }
    }),
    MergeShards: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        streamName: { type: 'UTF8', optional: false },
        shardToMerge: { type: 'UTF8', optional: false },
        adjacentShardToMerge: { type: 'UTF8', optional: false }
    }),
    SplitShard: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        streamName: { type: 'UTF8', optional: false },
        shardToSplit: { type: 'UTF8', optional: false },
        newStartingHashKey: { type: 'UTF8', optional: false }
    }),
    // Kafka
    UpdateClusterConfiguration: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterName: { type: 'UTF8', optional: false },
        configurationInfo: { type: 'JSON', optional: false }
    }),
    CreateTopic: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        topicName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteTopic: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        topicName: { type: 'UTF8', optional: false }
    }),
    UpdateBrokerStorage: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterArn: { type: 'UTF8', optional: false },
        currentVersion: { type: 'UTF8', optional: false },
        targetBrokerEBSVolumeInfo: { type: 'JSON', optional: false }
    }),
    UpdateBrokerType: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterArn: { type: 'UTF8', optional: false },
        currentVersion: { type: 'UTF8', optional: false },
        targetInstanceType: { type: 'UTF8', optional: false }
    }),
    //Aurora
    StartDBCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbClusterIdentifier: { type: 'UTF8', optional: false }
    }),
    StopDBCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbClusterIdentifier: { type: 'UTF8', optional: false }
    }),
    CreateDBClusterSnapshot: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbClusterSnapshotIdentifier: { type: 'UTF8', optional: false },
        dbClusterIdentifier: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteDBClusterSnapshot: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        dbClusterSnapshotIdentifier: { type: 'UTF8', optional: false }
    }),
    // redshift
    ModifyCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterIdentifier: { type: 'UTF8', optional: false },
        clusterType: { type: 'UTF8', optional: true },
        numberOfNodes: { type: 'INT32', optional: true },
        clusterSecurityGroups: { type: 'UTF8', repeated: true, optional: true },
        vpcSecurityGroupIds: { type: 'UTF8', repeated: true, optional: true },
        masterUserPassword: { type: 'UTF8', optional: true },
        clusterParameterGroupName: { type: 'UTF8', optional: true },
        automatedSnapshotRetentionPeriod: { type: 'INT32', optional: true },
        manualSnapshotRetentionPeriod: { type: 'INT32', optional: true },
        preferredMaintenanceWindow: { type: 'UTF8', optional: true },
        clusterVersion: { type: 'UTF8', optional: true },
        allowVersionUpgrade: { type: 'BOOLEAN', optional: true },
        clusterSubnetGroupName: { type: 'UTF8', optional: true },
        publiclyAccessible: { type: 'BOOLEAN', optional: true },
        encrypted: { type: 'BOOLEAN', optional: true },
        kmsKeyId: { type: 'UTF8', optional: true },
        enhancedVpcRouting: { type: 'BOOLEAN', optional: true },
        maintenanceTrackName: { type: 'UTF8', optional: true },
        snapshotScheduleIdentifier: { type: 'UTF8', optional: true },
        snapshotScheduleAssociationState: { type: 'UTF8', optional: true },
        expectedNextSnapshotScheduleTime: { type: 'UTF8', optional: true },
        expectedNextSnapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        nextSnapshotScheduleIdentifier: { type: 'UTF8', optional: true },
        nextSnapshotScheduleAssociationState: { type: 'UTF8', optional: true },
        nextSnapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        nextSnapshotScheduleTime: { type: 'UTF8', optional: true },
        snapshotScheduleIdentifierStatus: { type: 'UTF8', optional: true },
        snapshotScheduleState: { type: 'UTF8', optional: true },
        snapshotScheduleStateStatus: { type: 'UTF8', optional: true },
        snapshotScheduleTime: { type: 'UTF8', optional: true },
        snapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        snapshotScheduleIdentifier: { type: 'UTF8', optional: true },
        snapshotScheduleAssociationState: { type: 'UTF8', optional: true },
        snapshotScheduleTime: { type: 'UTF8', optional: true },
        snapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        snapshotScheduleState: { type: 'UTF8', optional: true },
        snapshotScheduleStateStatus: { type: 'UTF8', optional: true },  
        tags: { type: 'JSON', optional: true }
    }),
    RestoreFromClusterSnapshot: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterIdentifier: { type: 'UTF8', optional: false },
        snapshotIdentifier: { type: 'UTF8', optional: false },
        clusterSubnetGroupName: { type: 'UTF8', optional: true },
        publiclyAccessible: { type: 'BOOLEAN', optional: true },
        enhancedVpcRouting: { type: 'BOOLEAN', optional: true },
        maintenanceTrackName: { type: 'UTF8', optional: true },
        snapshotScheduleIdentifier: { type: 'UTF8', optional: true },
        snapshotScheduleAssociationState: { type: 'UTF8', optional: true },
        expectedNextSnapshotScheduleTime: { type: 'UTF8', optional: true },
        expectedNextSnapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        nextSnapshotScheduleIdentifier: { type: 'UTF8', optional: true },
        nextSnapshotScheduleAssociationState: { type: 'UTF8', optional: true },
        nextSnapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        nextSnapshotScheduleTime: { type: 'UTF8', optional: true },
        snapshotScheduleIdentifierStatus: { type: 'UTF8', optional: true },
        snapshotScheduleState: { type: 'UTF8', optional: true },
        snapshotScheduleStateStatus: { type: 'UTF8', optional: true },
        snapshotScheduleTime: { type: 'UTF8', optional: true },
        snapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        snapshotScheduleIdentifier: { type: 'UTF8', optional: true },
        snapshotScheduleAssociationState: { type: 'UTF8', optional: true },
        snapshotScheduleTime: { type: 'UTF8', optional: true },
        snapshotScheduleTimeStatus: { type: 'UTF8', optional: true },
        snapshotScheduleState: { type: 'UTF8', optional: true },
        snapshotScheduleStateStatus: { type: 'UTF8', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    CreateClusterSnapshot: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterSnapshotIdentifier: { type: 'UTF8', optional: false },
        clusterIdentifier: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteClusterSnapshot: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        clusterSnapshotIdentifier: { type: 'UTF8', optional: false }
    }),
    // Elasticache
    CreateCacheCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        cacheClusterId: { type: 'UTF8', optional: false },
        cacheNodeType: { type: 'UTF8', optional: false },
        engine: { type: 'UTF8', optional: false },
        engineVersion: { type: 'UTF8', optional: true },
        numCacheNodes: { type: 'INT32', optional: true },
        cacheSubnetGroupName: { type: 'UTF8', optional: true },
        cacheSecurityGroupNames: { type: 'UTF8', repeated: true, optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteCacheCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        cacheClusterId: { type: 'UTF8', optional: false }
    }),
    ModifyCacheCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        cacheClusterId: { type: 'UTF8', optional: false },
        cacheNodeType: { type: 'UTF8', optional: true },
        engineVersion: { type: 'UTF8', optional: true },
        numCacheNodes: { type: 'INT32', optional: true },
        cacheSecurityGroupNames: { type: 'UTF8', repeated: true, optional: true },
        applyImmediately: { type: 'BOOLEAN', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    RebootCacheCluster: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        cacheClusterId: { type: 'UTF8', optional: false }
    }),
    CreateCacheParameterGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        cacheParameterGroupName: { type: 'UTF8', optional: false },
        cacheParameterGroupFamily: { type: 'UTF8', optional: false },
        description: { type: 'UTF8', optional: true },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteCacheParameterGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        cacheParameterGroupName: { type: 'UTF8', optional: false }
    }),
    // Glue 
    CreateDatabase: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        databaseName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteDatabase: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        databaseName: { type: 'UTF8', optional: false }
    }),
    CreateCrawler: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        crawlerName: { type: 'UTF8', optional: false },
        role: { type: 'UTF8', optional: false },
        databaseName: { type: 'UTF8', optional: false },
        tablePrefix: { type: 'UTF8', optional: true }
    }),
    DeleteCrawler: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        crawlerName: { type: 'UTF8', optional: false }
    }),
    // Athena
    CreateWorkGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        workGroupName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteWorkGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        workGroupName: { type: 'UTF8', optional: false }
    }),
    UpdateWorkGroup: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        workGroupName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    StartQueryExecution: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        queryExecutionId: { type: 'UTF8', optional: false }
    }),
    StopQueryExecution: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        queryExecutionId: { type: 'UTF8', optional: false }
    }),
    // EMR
    RunJobFlow: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        jobFlowId: { type: 'UTF8', optional: false },
        name: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    TerminateJobFlows: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        jobFlowIds: { type: 'UTF8', repeated: true, optional: false }
    }),
    AddJobFlowSteps: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false }, 
        jobFlowId: { type: 'UTF8', optional: false },
        steps: { type: 'JSON', optional: false }
    }),
    CancelSteps: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        jobFlowId: { type: 'UTF8', optional: false },
        stepIds: { type: 'UTF8', repeated: true, optional: false }
    }),
    // CloudTrail
    CreateTrail: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        trailName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', repeated: true, optional: true }
    }),
    DeleteTrail: new parquet.ParquetSchema({    
        EventId: { type: 'UTF8', optional: false },
        trailName: { type: 'UTF8', optional: false }
    }),
    StartLogging: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        trailName: { type: 'UTF8', optional: false }
    }),
    StopLogging: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        trailName: { type: 'UTF8', optional: false }
    }),
    UpdateTrail: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },     
        trailName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', repeated: true, optional: true }
    }),
    PutEventSelectors: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        trailName: { type: 'UTF8', optional: false },
        advancedEventSelectors: { type: 'JSON', optional: false }
    }),
    // Session Management
    CreateSession: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        sessionId: { type: 'UTF8', optional: false },
        sessionName: { type: 'UTF8', optional: false },
        tags: { type: 'JSON', optional: true }
    }),
    DeleteSession: new parquet.ParquetSchema({
        EventId: { type: 'UTF8', optional: false },
        sessionId: { type: 'UTF8', optional: false }
    }),
    
    
};




module.exports = { CommonSchema, EventsSchemas, InventorySchema };
