// This module creates a Lambda Function and registers it to a specifica CloudTrail Event through EventBridge
// The Lambda Function logs the event to CloudWatch Logs

const { CloudTrailClient, } = require("@aws-sdk/client-cloudtrail");
const { LambdaClient, CreateFunctionCommand, AddPermissionCommand } = require("@aws-sdk/client-lambda");
const { EventBridgeClient, PutRuleCommand, PutTargetsCommand } = require("@aws-sdk/client-eventbridge");
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } = require("@aws-sdk/client-iam");
const fs = require("fs");
const {v4: uuidv4} = require("uuid");

const region = "us-east-1"; // Change to your AWS region

const eventBridgeClient = new EventBridgeClient({ region });
const lambdaClient = new LambdaClient({ region });
const iamClient = new IAMClient({ region });

const lambdaRoleName = "FAICloudTrailLambdaExecutionRole";
const lambdaFunctionName = "FAICloudTrailEventLogger";
const ruleName = "ModifyInstanceAttributeRule";
const accountId = "058264435853";
const ruleArn = `arn:aws:events:${region}:${accountId}:rule/${ruleName}`; // TODO: Replace with your AWS Account ID

async function createIamRole() {
    try {
        const assumeRolePolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: {
                        Service: "lambda.amazonaws.com"
                    },
                    Action: "sts:AssumeRole"
                }
            ]
        };

        const roleCommand = new CreateRoleCommand({
            RoleName: lambdaRoleName,
            AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy)
        });

        const roleResponse = await iamClient.send(roleCommand);
        console.log(`Created IAM Role: ${roleResponse.Role.Arn}`);

        // Attach AWS managed Lambda execution policy
        const policyCommand = new AttachRolePolicyCommand({
            RoleName: lambdaRoleName,
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        });
        await iamClient.send(policyCommand);

        return roleResponse.Role.Arn;
    } catch (error) {
	    console.log ("Caught Error, ",error);
        if (error.name === 'EntityAlreadyExistsException') {
            console.log('IAM Role already exists, proceeding...');
            return `arn:aws:iam::${accountId}:role/${lambdaRoleName}`;
        } else {
            throw error;
        }
    }
}

async function createLambdaFunction(roleArn) {
    try {
        const lambdaCode = `
        exports.handler = async (event) => {
            console.log("Received event:", JSON.stringify(event, null, 2));
        };
        `;

        const archiver = require('archiver');
        const output = fs.createWriteStream('/tmp/lambda_function.zip');
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
        });

        archive.on('error', function (err) {
            throw err;
        });

        archive.pipe(output);
        archive.append(lambdaCode, { name: 'index.js' });
        await archive.finalize();
        await new Promise(resolve => setTimeout(resolve, 5000))


        const Buf =  fs.readFileSync("/tmp/lambda_function.zip")
	console.log("Buffer is ",Buf, Buf.length)
        const functionCommand = new CreateFunctionCommand({
            FunctionName: lambdaFunctionName,
            Runtime: "nodejs18.x",
            Role: roleArn,
            Handler: "index.handler",
            Code: {
                //ZipFile: fs.readFileSync("/tmp/lambda_function.zip")
                ZipFile: Buf//Buffer.from("/tmp/lambda_function.zip")
            },
            Timeout: 10
        });

        const functionResponse = await lambdaClient.send(functionCommand);
        console.log(`Created Lambda Function: ${functionResponse.FunctionArn}`);

        return functionResponse.FunctionArn;
    } catch (error) {
        if (error.name === 'ResourceConflictException') {
            console.log('Lambda function already exists, proceeding...');
            return `arn:aws:lambda:${region}:${accountId}:function:${lambdaFunctionName}`;
        } else {
            throw error;
        }
    }
}
const ignoreEvents = [ "LookupEvents", "SearchAgreements", "AWSPaymentPortalService.GetAccountPreferences", "Programs_ListPaymentProgramStatus", "AWSPaymentPortalService.DescribePaymentsDashboard", 
    "AWSPaymentPortalService.GetAccountPreferences", "Programs_ListPaymentProgramStatus", "AWSPaymentPortalService.DescribePaymentsDashboard", "GenerateRecommendations", "SharedSnapshotVolumeCreated",
    "AcceptAgreementRequest", "SearchListings", "RedeemCode", "UpdateSecurityGroupRuleDescriptionsIngress", "UpdateSecurityGroupRuleDescriptionsEgress", "SendHeartBeat", "GenerateServiceLastAccessedDetails",
    "SearchUsers", "BatchGetSession", "PaymentPrerequisites", "SetPaymentInstrument", "SearchGroups", "GenerateServiceLastAccessedDetails", "PutCredentials", "CreateBudget", "VerifyEmail", "CreateBudget",
"AWSPaymentPortalService.GetPaymentsDue" ];



const writeEvents = {
    ec2: ["RunInstances", "TerminateInstances", "ModifyInstanceAttribute", "StartInstances", "StopInstances", "RebootInstances", "CreateTags", "DeleteTags", "EnableSerialConsoleAccess", "DeleteKeyPair"],
    s3: ["PutObject", "DeleteObject", "CreateBucket", "DeleteBucket", "PutBucketPolicy", "PutBucketAcl", "PutBucketEncryption"],
    iam: ["CreateUser", "DeleteUser", "AttachRolePolicy", "DetachRolePolicy", "CreateRole", "DeleteRole", "AssumeRole", "CreateGroup", "DeleteGroup", "AddUserToGroup", "RemoveUserFromGroup", "AddMemberToGroup",
            "RemoveMemberFromGroup", "AttachGroupPolicy", "DetachGroupPolicy", "CreatePolicy", "DeletePolicy", "AttachUserPolicy", "DetachUserPolicy", "AttachRolePolicy", "DetachRolePolicy", "AttachGroupPolicy", 
            "DetachGroupPolicy", "CreateInstanceProfile", "DeleteInstanceProfile", "AddRoleToInstanceProfile", "RemoveRoleFromInstanceProfile", "AddRoleToInstanceProfile", "AttachManagedPolicyToPermissionSet",
            "CompleteVirtualMfaDeviceRegistration", "CreateInstanceProfile", "CreatePermissionSet", "CreatePolicyVersion", "DeleteAccessKey", "DeleteLoginProfile", "DeleteMfaDeviceForUser", "DeleteUserPolicy",
            "DetachUserPolicy", "DisassociateProfile", "EnableMFADevice", "GenerateCredentialReport", "PutMfaDeviceManagementForDirectory", "PutUserPermissionsBoundary", "PutUserPolicy" ],
    organization: ["InviteAccountToOrganization", "RemoveAccountFromOrganization", "CreateOrganization", "DeleteOrganization", "EnableAWSServiceAccess", "DisableAWSServiceAccess", "EnableAllFeatures", 
        "DisableAllFeatures", "EnablePolicyType", "DisablePolicyType", "AttachPolicy", "DetachPolicy", "ListPoliciesForTarget", "ListTargetsForPolicy", "UpdatePolicy", 
        "CreateAccount", "DeleteAccount", "UpdateOrganizationalUnit", "CreateOrganizationalUnit", "DeleteOrganizationalUnit", "MoveAccount"],
    lambda: ["CreateFunction20150331", "DeleteFunction20150331", "UpdateFunctionCode20150331v2", "UpdateFunction20150331","Invoke20150331", "UpdateFunctionConfiguration20150331v2", "CreateAlias20150331", 
        "DeleteAlias20150331", "UpdateAlias20150331", "CreateEventSourceMapping", "DeleteEventSourceMapping", "UpdateEventSourceMapping", "TagResource", "UntagResource", "PublishLayerVersion", 
        "DeleteLayerVersion", "PutProvisionedConcurrencyConfig", "DeleteProvisionedConcurrencyConfig", "CreateCodeSigningConfig", "UpdateCodeSigningConfig", "DeleteCodeSigningConfig", 
        "PutFunctionEventInvokeConfig", "DeleteFunctionEventInvokeConfig", ],
    kms: ["CreateAlias", "DeleteAlias", "CreateKey", "DeleteKey", "EnableKey", "DisableKey", "ScheduleKeyDeletion", "CancelKeyDeletion"],
    vpc: ["CreateVpc", "DeleteVpc", "CreateSubnet", "DeleteSubnet", "CreateSecurityGroup", "DeleteSecurityGroup", "AuthorizeSecurityGroupIngress", "AuthorizeSecurityGroupEgress", "AttachInternetGateway",
          "CreateInternetGateway", "CreateRoute", "ReplaceRoute", "AutomatedDefaultVpcCreation", "ModifyNetworkInterfaceAttribute", "DetachNetworkInterface"],
    misc: ["RegisterRegion"],
    authentication: ["Authenticate", "CredentialChallenge", "CredentialVerification", "Federate"],
    cloudwatch: ["StartLiveTail", "StopLiveTail"],
    dynamodb: ["PutItem", "UpdateItem", "DeleteItem", "CreateTable", "DeleteTable", "UpdateTable"],
    rds: ["CreateDBInstance", "DeleteDBInstance", "ModifyDBInstance", "CreateDBCluster", "DeleteDBCluster", "ModifyDBCluster"],
    cloudwatch: ["PutMetricData", "DeleteAlarms", "SetAlarmState", "PutDashboard", "DeleteDashboards"],
    sns: ["CreateTopic", "DeleteTopic", "Subscribe", "Unsubscribe", "Publish"],
    sqs: ["CreateQueue", "DeleteQueue", "SendMessage", "DeleteMessage", "PurgeQueue"],
    ecs: ["CreateCluster", "DeleteCluster", "UpdateService", "RunTask", "StopTask", "RegisterTaskDefinition"],
    eks: ["CreateCluster", "DeleteCluster", "UpdateClusterConfig", "CreateNodegroup", "DeleteNodegroup", "UpdateNodegroupConfig"],
    cloudformation: ["CreateStack", "DeleteStack", "UpdateStack", "CreateChangeSet", "ExecuteChangeSet", "RollbackStack"],
    kinesis: ["CreateStream", "DeleteStream", "PutRecord", "PutRecords", "MergeShards", "SplitShard"],
    kafka: ["UpdateClusterConfiguration", "CreateTopic", "DeleteTopic", "UpdateBrokerStorage", "UpdateBrokerType"],
    aurora: ["StartDBCluster", "StopDBCluster", "CreateDBClusterSnapshot", "DeleteDBClusterSnapshot"],
    redshift: ["ModifyCluster", "RestoreFromClusterSnapshot", "CreateClusterSnapshot", "DeleteClusterSnapshot"],
    elasticache: ["CreateCacheCluster", "DeleteCacheCluster", "ModifyCacheCluster", "RebootCacheCluster", "CreateCacheParameterGroup", "DeleteCacheParameterGroup"],
    glue: ["CreateDatabase", "DeleteDatabase", "CreateCrawler", "DeleteCrawler"],
    athena: ["CreateWorkGroup", "DeleteWorkGroup", "UpdateWorkGroup", "StartQueryExecution", "StopQueryExecution"],
    emr: ["RunJobFlow", "TerminateJobFlows", "AddJobFlowSteps", "CancelSteps"],
    cloudtrail: ["CreateTrail", "DeleteTrail", "StartLogging", "StopLogging", "UpdateTrail", "PutEventSelectors"],
    sessionmanager: ["CreateSession", "DeleteSession"],
};

function buildLookupAttributes() {
    const lookupAttributes = [];//[ {AttributeKey: "EventName", AttributeValue: "TerminateInstances"}]//[];
    //return [ {AttributeKey: "EventName", AttributeValue: "EnableSerialConsoleAccess"}];
    const addAttributes = (events) => {
        for (const service in events) {
            events[service].forEach(event => {
                lookupAttributes.push({
                    AttributeKey: "EventName",
                    AttributeValue: event
                });
            });
        }
    };

    addAttributes(readOnlyEvents);
    addAttributes(writeEvents);
    return lookupAttributes;
}

//const lookupAttributes = buildLookupAttributes();
//console.log(lookupAttributes);
async function createEventBridgeRule() {
    try {
        const ruleCommand = new PutRuleCommand({
            Name: ruleName,
            EventPattern: JSON.stringify({
                source: ["aws.ec2"],
                detail: {
                    eventName: ["ModifyInstanceAttribute"]
                }
            }),
            State: "ENABLED"
        });

        const ruleResponse = await eventBridgeClient.send(ruleCommand);
        console.log(`Created EventBridge Rule: ${ruleResponse.RuleArn}`);

        return ruleResponse.RuleArn;
    } catch (error) {
        if (error.name === 'ResourceAlreadyExistsException') {
            console.log('EventBridge rule already exists, proceeding...');
            return ruleArn;
        } else {
            throw error;
        }
    }
}

async function addLambdaPermission(lambdaArn) {
    try {
        const permissionCommand = new AddPermissionCommand({
            FunctionName: lambdaFunctionName,
            StatementId: uuidv4(),
            Action: "lambda:InvokeFunction",
            Principal: "events.amazonaws.com",
            SourceArn: ruleArn
        });

        await lambdaClient.send(permissionCommand);
        console.log("Added EventBridge permission to Lambda function.");
    } catch (error) {
        if (error.name === 'ResourceConflictException') {
            console.log('Permission already exists, proceeding...');
        } else {
            throw error;
        }
    }
}

async function addEventBridgeTarget(lambdaArn) {
    try {
        const targetCommand = new PutTargetsCommand({
            Rule: ruleName,
            Targets: [
                {
                    Id: "1",
                    Arn: lambdaArn
                }
            ]
        });

        await eventBridgeClient.send(targetCommand);
        console.log("Added Lambda as a target to EventBridge rule.");
    } catch (error) {
        if (error.name === 'ResourceAlreadyExistsException') {
            console.log('Target already exists, proceeding...');
        } else {
            throw error;
        }
    }
}

async function main() {
    try {
        const roleArn = await createIamRole();
        const lambdaArn = await createLambdaFunction(roleArn);
        const ruleArn = await createEventBridgeRule();
        await addLambdaPermission(lambdaArn);
        await addEventBridgeTarget(lambdaArn);
        console.log("Successfully configured CloudTrail event handling.");
    } catch (error) {
        console.error("Error setting up event handling:", error);
    }
}

module.exports = { ignoreEvents, buildLookupAttributes };
