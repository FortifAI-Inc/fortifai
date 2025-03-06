// This module creates a Lambda Function and registers it to a specifica CloudTrail Event through EventBridge
// The Lambda Function logs the event to CloudWatch Logs
//


/**
 * Creates an IAM Role for Lambda execution with the necessary permissions.
 * 
 * @returns {Promise<string>} The ARN of the created IAM Role.
 */
async function createIamRole() {}

/**
 * Creates a Lambda function with the specified IAM Role.
 * 
 * @param {string} roleArn - The ARN of the IAM Role to be assumed by the Lambda function.
 * @returns {Promise<string>} The ARN of the created Lambda function.
 */
async function createLambdaFunction(roleArn) {}

/**
 * Creates an EventBridge rule to capture specific CloudTrail events.
 * 
 * @returns {Promise<string>} The ARN of the created EventBridge rule.
 */
async function createEventBridgeRule() {}

/**
 * Adds permission to the Lambda function to allow EventBridge to invoke it.
 * 
 * @param {string} lambdaArn - The ARN of the Lambda function.
 * @returns {Promise<void>}
 */
async function addLambdaPermission(lambdaArn) {}

/**
 * Adds the Lambda function as a target to the EventBridge rule.
 * 
 * @param {string} lambdaArn - The ARN of the Lambda function.
 * @returns {Promise<void>}
 */
async function addEventBridgeTarget(lambdaArn) {}

/**
 * Main function to set up the CloudTrail event handling by creating IAM Role, Lambda function,
 * EventBridge rule, and configuring permissions and targets.
 * 
 * @returns {Promise<void>}
 */
async function main() {}

import {
    CloudTrailClient,
  } from "@aws-sdk/client-cloudtrail";
  import {
    LambdaClient,
    CreateFunctionCommand,
    AddPermissionCommand
  } from "@aws-sdk/client-lambda";
  import {
    EventBridgeClient,
    PutRuleCommand,
    PutTargetsCommand
  } from "@aws-sdk/client-eventbridge";
  import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } from "@aws-sdk/client-iam";
  import fs from "fs";
  import { v4 as uuidv4 } from "uuid";
  
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
      Version: "2025-03-06",
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
  
    fs.writeFileSync("/tmp/lambda_function.zip", lambdaCode);
  
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
  