const { EC2 } = require("@aws-sdk/client-ec2");
const { Lambda } = require("@aws-sdk/client-lambda");
const { RDS } = require("@aws-sdk/client-rds");
const { S3 } = require("@aws-sdk/client-s3");

const DL_access = require('../DataLake/DL_access');
const DL_S3_access = require('../DataLake/DL_S3_access');
const { IAM } = require("@aws-sdk/client-iam");
const { ec2Schema, VpcSchema, S3Schema, IGWSchema, SGSchema, NISchema, LambdaSchema, IAMRoleSchema, IAMPolicySchema, UserSchema } = require('../DataLake/DL_S3_Assets_schema');

const EnvRegion = 'eu-north-1'
//const EnvRegion = 'us-east-1'

/// TBD: https://github.com/thiagosanches/awscraper/tree/main/scrapers has many more scrapers, e.g. glue jobs, Lambdas and more
/// TBD: map ECS / EKS workloads



// This function should interface with AWS's infrastructure and obtain a list of all provisioned elements - EC2, VPCs, SGs etc
// This function should be called at the start of the program
async function InventoryAssets() {
    console.log("Inventorying AWS environment...");
    const ec2 = new EC2({
        region: EnvRegion,
    });
    const s3 = new S3({
        region: EnvRegion,
    });
    const rds = new RDS({
        region: EnvRegion,
    });
    const lambda = new Lambda({
        region: EnvRegion,
    });

    try {
        // Get EC2 instances
        const ec2Instances = await ec2.describeInstances();
        const instanceList = ec2Instances.Reservations.map(reservation => reservation.Instances).flat();
        let records = []
        let S3_KEY = ' '
        S3_KEY = 'Assets/ec2inventory.parquet';
        for (const instance of instanceList) {
            IfIDs = []
            for (const networkInterface of instance.NetworkInterfaces) {
                IfIDs.push(networkInterface.NetworkInterfaceId);
            }
            const ec2Data = {
                UniqueId: instance.InstanceId,
                InstanceId: instance.InstanceId,
                InstanceType: instance.InstanceType,
                InstanceState: instance.State.Name,
                LaunchTime: instance.LaunchTime,
                PrivateIpAddress: instance.PrivateIpAddress,
                PublicIpAddress: instance.PublicIpAddress,
                SubnetId: instance.SubnetId,
                VpcId: instance.VpcId,
                Architecture: instance.Architecure,
                ClientToken: instance.ClientToken,
                ElasticGpuAssociations: instance.ElasticGpuAssociations,
                ElasticInferenceAcceleratorAssociations: instance.ElasticInferenceAcceleratorAssociations,
                NetworkInterfaces: IfIDs, // for now save only the IfID, later figure out how to store an object
                CpuOptions: instance.CpuOptions.CoreCount * instance.CpuOptions.ThreadsPerCore + " threads total",
                PlatformDetails: instance.PlatformDetails
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === ec2Data.InstanceId);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${ec2Data.InstanceId}`);
                records[index] = ec2Data; // Update record
            } else {
                //console.log(`Adding new instance: ${ec2Data.InstanceId}`);
                records.push(ec2Data); // Insert new record
            }
        }
        if (records.length > 0) {
            DL_access.writeData(ec2Schema, records, S3_KEY);
        }
        console.log("EC2 Instances count:", instanceList.length);

        // Get VPCs
        const vpcs = await ec2.describeVpcs();
        S3_KEY = 'Assets/vpcinventory.parquet';
        console.log("VPCs count:", vpcs.Vpcs.length);

        for (const vpc of vpcs.Vpcs) {
            const VpcData = {
                UniqueId: vpc.VpcId,
                VpcId: vpc.VpcId,
                CidrBlock: vpc.CidrBlock
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            const index = records.findIndex(rec => rec.UniqueId === VpcData.VpcId);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${VpcData.VpcId}`);
                records[index] = VpcData; // Update record
            } else {
                //console.log(`Adding new instance: ${VpcData.VpcId}`);
                records.push(VpcData); // Insert new record
            }
        }
        if (records.length > 0) {
            DL_access.writeData(VpcSchema, records, S3_KEY);
        }

        // Get S3 buckets
        const s3Buckets = await s3.listBuckets();
        S3_KEY = 'Assets/S3Bucketinventory.parquet';
        for (const bucket of s3Buckets.Buckets) {
            const S3Data = {
                UniqueId: bucket.Name,
                Name: bucket.Name,
                CreationDate: bucket.CreationDate
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === S3Data.Name);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${S3Data.Name}`);
                records[index] = S3Data; // Update record
            } else {
                //console.log(`Adding new instance: ${S3Data.Name}`);
                records.push(S3Data); // Insert new record
            }

        }
        if (records.length > 0) {
            DL_access.writeData(S3Schema, records, S3_KEY);
        }
        console.log("S3 Buckets count:", s3Buckets.Buckets.length);

        // Get internet gateways
        const internetGateways = await ec2.describeInternetGateways();
        S3_KEY = 'Assets/IGWBucketinventory.parquet';
        console.log("Internet Gateways count:", internetGateways.InternetGateways.length);
        for (const igw of internetGateways.InternetGateways) {
            const IGWData = {
                UniqueId: igw.InternetGatewayId,
                InternetGatewayId: igw.InternetGatewayId,
                VpcId: igw.VpcId
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === IGWData.InternetGatewayId);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${IGWData.InternetGatewayId}`);
                records[index] = IGWData; // Update record
            } else {
                //console.log(`Adding new instance: ${IGWData.InternetGatewayId}`);
                records.push(IGWData); // Insert new record
            }
        }
        if (records.length > 0) {
            DL_access.writeData(IGWSchema, records, S3_KEY);
        }

        // Get security groups
        const securityGroups = await ec2.describeSecurityGroups();
        S3_KEY = 'Assets/SGBucketinventory.parquet';
        console.log("Security Groups count:", securityGroups.SecurityGroups.length);
        for (const sg of securityGroups.SecurityGroups) {
            const SGData = {
                UniqueId: sg.GroupId,
                GroupId: sg.GroupId,
                VpcId: sg.VpcId
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === SGData.GroupId);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${SGData.GroupId}`);
                records[index] = SGData; // Update record
            } else {
                //console.log(`Adding new instance: ${SGData.GroupId}`);
                records.push(SGData); // Insert new record
            }
        }
        if (records.length > 0) {
            DL_access.writeData(SGSchema, records, S3_KEY);
        }

        // Get network interfaces
        const networkInterfaces = await ec2.describeNetworkInterfaces();
        S3_KEY = 'Assets/NIBucketinventory.parquet';
        console.log("Network Interfaces count:", networkInterfaces.NetworkInterfaces.length);
        for (const ni of networkInterfaces.NetworkInterfaces) {
            const NIData = {
                UniqueId: ni.NetworkInterfaceId,
                NetworkInterfaceId: ni.NetworkInterfaceId,
                AvailabilityZone: ni.AvailabilityZone,
                PrivateIpAddress: ni.PrivateIpAddress,
                PublicIp: ni.Association ? ni.Association.PublicIp : null,
                Description: ni.Description,
                AttachmentId: ni.Attachment ? ni.Attachment.AttachmentId : null,
                InstanceId: ni.Attachment ? ni.Attachment.InstanceId : null,
                VpcId: ni.VpcId,
                SubnetId: ni.SubnetId,
                GroupId: ni.Groups ? ni.Groups.map(group => group.GroupId).join(',') : null
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === NIData.NetworkInterfaceId);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${NIData.NetworkInterfaceId}`);
                records[index] = NIData; // Update record
            } else {
                //console.log(`Adding new instance: ${NIData.NetworkInterfaceId}`);
                records.push(NIData); // Insert new record
            }
        }
        if (records.length > 0) {
            DL_access.writeData(NISchema, records, S3_KEY);
        }

        // Get Lambda functions
        const lambdaFunctions = await lambda.listFunctions();
        S3_KEY = 'Assets/LambdaBucketinventory.parquet';
        console.log("Lambda Functions count:", lambdaFunctions.Functions.length);
        for (const lambdaFunction of lambdaFunctions.Functions) {
            const LambdaData = {
                UniqueId: lambdaFunction.FunctionName,
                FunctionName: lambdaFunction.FunctionName,
                Description: lambdaFunction.Description,
                Role: lambdaFunction.Role
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === LambdaData.FunctionName);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${LambdaData.FunctionName}`);
                records[index] = LambdaData; // Update record
            } else {
                //console.log(`Adding new instance: ${LambdaData.FunctionName}`);
                records.push(LambdaData); // Insert new record
            }
        }
        if (records.length > 0) {
            DL_access.writeData(LambdaSchema, records, S3_KEY);
        }

        // Get RDS instances
        const rdsInstances = await rds.describeDBInstances();
        //console.log("RDS Instances:", rdsInstances.DBInstances);
        console.log("RDS Instances count:", rdsInstances.DBInstances.length);

    } catch (error) {
        console.error("Error retrieving AWS resources:", error);
        throw error;
    }

    //TODO: RDS, ECS, EKS, DataBase
    CollectRoles()
    CollectPolicies()
    CollectUsers()
    return;
}

// This function should interface with AWS's infrastructure and obtain a list of all IAM roles
async function CollectRoles() {
    const iam = new IAM({
        region: 'us-east-1',
    });
    let S3_KEY = 'Assets/IAMRoleBucketinventory.parquet';

    try {
        // Get IAM roles
        const roles = await iam.listRoles();
        console.log("IAM Roles count:", roles.Roles.length);
        let records = []
        for (const role of roles.Roles) {
            const IAMRoleData = {
                UniqueId: role.RoleId,
                RoleId: role.RoleId,
                RoleName: role.RoleName,
                AssumeRolePolicyDocument: role.AssumeRolePolicyDocument
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === IAMRoleData.RoleId);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${IAMRoleData.RoleId}`);
                records[index] = IAMRoleData; // Update record
            } else {
                //console.log(`Adding new instance: ${IAMRoleData.RoleId}`);
                records.push(IAMRoleData); // Insert new record
            }

        }
        if (records.length > 0) {
            DL_access.writeData(IAMRoleSchema, records, S3_KEY);
        }
        //return roles.Roles;
    } catch (error) {
        console.error("Error retrieving IAM roles:", error);
        throw error;
    }
}

// This function should interface with AWS's infrastructure and obtain a list of all policies
async function CollectPolicies() {
    const iam = new IAM({
        region: 'us-east-1',
    });
    let S3_KEY = 'Assets/IAMPolicyBucketinventory.parquet'

    try {
        // Get IAM policies
        const policies = await iam.listPolicies({ Scope: 'Local' });
        console.log("IAM Policies count:", policies.Policies.length);
        let records = []
        for (const policy of policies.Policies) {
            const policyDetails = await iam.getPolicy({ PolicyArn: policy.Arn });
            const policyVersion = await iam.getPolicyVersion({
                PolicyArn: policy.Arn,
                VersionId: policyDetails.Policy.DefaultVersionId
            });
            const IAMPolicyData = {
                UniqueId: policy.PolicyId,
                PolicyId: policy.PolicyId,
                PolicyName: policy.PolicyName,
                AttachmentCount: policy.AttachmentCount,
                PermissionsBoundaryUsageCount: policy.PermissionsBoundaryUsageCount,
                Document: policyVersion.PolicyVersion.Document
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === IAMPolicyData.PolicyId);
            if (index !== -1) {
                //console.log(`Updating existing instance: ${IAMPolicyData.PolicyId}`);
                records[index] = IAMPolicyData; // Update record
            } else {
                //console.log(`Adding new instance: ${IAMPolicyData.PolicyId}`);
                records.push(IAMPolicyData); // Insert new record
            }
        }
        if (records.length > 0) {
            DL_access.writeData(IAMPolicySchema, records, S3_KEY);
        }
        return policies.Policies;
    } catch (error) {
        console.error("Error retrieving IAM policies:", error);
        throw error;
    }
    CollectPermissions()
}

// This function should interface with AWS's infrastructure and obtain a list of all IAM users and their associated access keys
async function CollectUsers() {
    const iam = new IAM({
        region: 'us-east-1',
    });
    let S3_KEY = 'Assets/UserBucketinventory.parquet'

    try {
        // Get IAM users
        const users = await iam.listUsers();
        console.log("IAM Users count:", users.Users.length);
        let records = []
        for (const user of users.Users) {
            //console.log("User: ", user);
            const accessKeys = await iam.listAccessKeys({ UserName: user.UserName });
            const attachedPolicies = await iam.listAttachedUserPolicies({ UserName: user.UserName });
            const inlinePolicies = await iam.listUserPolicies({ UserName: user.UserName });

            const consolidatedUser = {
                ...user,
                AccessKeys: accessKeys.AccessKeyMetadata,
                AttachedPolicies: attachedPolicies.AttachedPolicies,
                InlinePolicies: inlinePolicies.PolicyNames
            };

            //console.log(`Consolidated user data for ${user.UserName}:`, JSON.stringify(consolidatedUser, null, 2));
            AccessKeys = []
            for (const accessKey of consolidatedUser.AccessKeys) {
                AccessKeys.push(accessKey.AccessKeyId);
            }
            PolicyNames = []
            for (const policy of consolidatedUser.AttachedPolicies) {
                PolicyNames.push(policy.PolicyName);
            }
            InlinePolicies = []
            for (const policy of consolidatedUser.InlinePolicies) {
                InlinePolicies.push(policy);
            }

            const UserData = {
                UniqueId: consolidatedUser.UserId,
                UserId: consolidatedUser.UserId,
                UserName: consolidatedUser.UserName,
                AccessKeyIds: AccessKeys,
                AttachedPolicyNames: PolicyNames,
                InlinePolicyNames: InlinePolicies
            }
            records = await DL_S3_access.fetchParquetFromS3(S3_KEY);

            // Check if InstanceId already exists

            const index = records.findIndex(rec => rec.UniqueId === UserData.UserId);
            if (index !== -1) {
                //console.log(`Updating existing UserId: ${UserData.UserId}`);
                records[index] = UserData; // Update record
            } else {
                //console.log(`Adding new UserId: ${UserData.UserId}`);
                records.push(UserData); // Insert new record
            }

        }
        if (records.length > 0) {
            DL_access.writeData(UserSchema, records, S3_KEY);
        }
        return users.Users;
    } catch (error) {
        console.error("Error retrieving IAM users and access keys:", error);
        throw error;
    }
}

module.exports = {
    InventoryAssets,
    //CollectRoles,
    //CollectPolicies,
    //CollectUsers
};
