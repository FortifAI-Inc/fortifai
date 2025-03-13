const ec2Schema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false}, // have a standard uniqueId for all assets, each of them will hold the relevant ID from AWS
    InstanceId: { type: 'UTF8', optional: false },
    InstanceType: { type: 'UTF8', optional: true },
    InstanceState: { type: 'UTF8', optional: true },
    LaunchTime: { type: 'UTF8', optional: true },
    PrivateIpAddress: { type: 'UTF8', optional: true },
    PublicIpAddress: { type: 'UTF8', optional: true },
    SubnetId: { type: 'UTF8', optional: true },
    VpcId: { type: 'UTF8', optional: true },
    Architecture: { type: 'UTF8', optional: true},
    ClientToken: { type: 'UTF8', optional: true},
    ElasticGpuAssociations: { type: 'UTF8', optional: true},
    ElasticInferenceAcceleratorAssociations: { type: 'UTF8', optional: true},
    NetworkInterfaces: { type: 'UTF8', repeated: true}, // for now save only the IfID, later figure out how to store an object
    CpuOptions: { type: 'UTF8', optional: true},
    PlatformDetails: { type: 'UTF8', optional: true},
    /*,
    securityGroups: { type: 'UTF8', optional: true },
    tags: { type: 'UTF8', optional: true }*/
});
const VpcSchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    VpcId: { type: 'UTF8', optional: false },
    CidrBlock: { type: 'UTF8', optional: false }
    //tags: { type: 'UTF8', optional: true }*/
});
const S3Schema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    Name: { type: 'UTF8', optional: false },
    CreationDate: { type: 'UTF8', optional: false }
    //tags: { type: 'UTF8', optional: true }*/
});
const IGWSchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    InternetGatewayId: { type: 'UTF8', optional: false },
    VpcId: { type: 'UTF8', optional: true }
    //tags: { type: 'UTF8', optional: true }*/
});
const SGSchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    GroupId: { type: 'UTF8', optional: false },
    VpcId: { type: 'UTF8', optional: false }
    //tags: { type: 'UTF8', optional: true }*/
});
const NISchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    NetworkInterfaceId: { type: 'UTF8', optional: false },
    AvailabilityZone: { type: 'UTF8', optional: false },
    PrivateIpAddress: { type: 'UTF8', optional: false },
    PublicIp: { type: 'UTF8', optional: true },
    Description: { type: 'UTF8', optional: true },
    AttachmentId: { type: 'UTF8', optional: true },
    InstanceId: { type: 'UTF8', optional: true },
    VpcId: { type: 'UTF8', optional: false }, 
    SubnetId: { type: 'UTF8', optional: false },
    GroupId: { type: 'UTF8', optional: true },
    //tags: { type: 'UTF8', optional: true }*/
});
const LambdaSchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    FunctionName: { type: 'UTF8', optional: false },
    Description: { type: 'UTF8', optional: true },
    Role: { type: 'UTF8', optional: false }
    //tags: { type: 'UTF8', optional: true }*/
});
const IAMRoleSchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    RoleId: { type: 'UTF8', optional: false },
    RoleName: { type: 'UTF8', optional: false },
    AssumeRolePolicyDocument: { type: 'UTF8', optional: false }
});
const IAMPolicySchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    PolicyId: { type: 'UTF8', optional: false },
    PolicyName: { type: 'UTF8', optional: false },
    AttachmentCount: { type: 'INT32', optional: false },
    PermissionsBoundaryUsageCount: {type: 'INT32', optional: false},
    Document: {type: 'UTF8', optional: false}
});
const UserSchema = new parquet.ParquetSchema({
    UniqueId: { type: 'UTF8', optional: false },
    UserId: { type: 'UTF8', optional: false },
    UserName: { type: 'UTF8', optional: false },
    AccessKeyIds: { type: 'UTF8', repeated: true },
    AttachedPolicyNames: {type: 'UTF8', repeated: true},
    InlinePolicyNames: {type: 'UTF8', repeated: true}
});
module.exports = {
    ec2Schema,
    VpcSchema,
    S3Schema,
    IGWSchema,
    SGSchema,
    NISchema,
    LambdaSchema,
    IAMRoleSchema,
    IAMPolicySchema,
    UserSchema
};
