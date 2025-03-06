// This module creates a Lambda Function and registers it to a specifica CloudTrail Event through EventBridge
// The Lambda Function logs the event to CloudWatch Logs

const { CloudTrailClient, } = require("@aws-sdk/client-cloudtrail");
const { LambdaClient, CreateFunctionCommand, AddPermissionCommand } = require("@aws-sdk/client-lambda");
const { EventBridgeClient, PutRuleCommand, PutTargetsCommand } = require("@aws-sdk/client-eventbridge");
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } = require("@aws-sdk/client-iam");
const fs = require("fs");
const uuidv4 = require("uuid");

const region = "us-east-1"; // Change to your AWS region

const eventBridgeClient = new EventBridgeClient({ region });
const lambdaClient = new LambdaClient({ region });
const iamClient = new IAMClient({ region });

const lambdaRoleName = "FAICloudTrailLambdaExecutionRole";
const lambdaFunctionName = "FAICloudTrailEventLogger";
const ruleName = "ModifyInstanceAttributeRule";
const ruleArn = `arn:aws:events:${region}:058264435853:rule/${ruleName}`; // TODO: Replace with your AWS Account ID

async function createIamRole() {
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
}

async function createLambdaFunction(roleArn) {
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

    const functionCommand = new CreateFunctionCommand({
        FunctionName: lambdaFunctionName,
        Runtime: "nodejs18.x",
        Role: roleArn,
        Handler: "index.handler",
        Code: {
            ZipFile: fs.readFileSync("/tmp/lambda_function.zip")
        },
        Timeout: 10
    });

    const functionResponse = await lambdaClient.send(functionCommand);
    console.log(`Created Lambda Function: ${functionResponse.FunctionArn}`);

    return functionResponse.FunctionArn;
}

async function createEventBridgeRule() {
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
}

async function addLambdaPermission(lambdaArn) {
    const permissionCommand = new AddPermissionCommand({
        FunctionName: lambdaFunctionName,
        StatementId: uuidv4(),
        Action: "lambda:InvokeFunction",
        Principal: "events.amazonaws.com",
        SourceArn: ruleArn
    });

    await lambdaClient.send(permissionCommand);
    console.log("Added EventBridge permission to Lambda function.");
}

async function addEventBridgeTarget(lambdaArn) {
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

main();

