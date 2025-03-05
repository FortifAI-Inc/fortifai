const parquet = require('parquetjs-lite');
const fs = require('fs');
const stream = require("stream");
const util = require("util");

const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client( {region: "us-east-1"} );

const bucketName = 'hilikdatalake';



// Queue to serialize write operations
let writeQueue = Promise.resolve();

/**
 * Adds a write operation to the queue to ensure writes are serialized.
 * @param {Object} data - JSON representing EC2 instance parameters.
 */
function enqueueS3Write(type, subtype, data) {
  writeQueue = writeQueue.then(() => writeS3Data(type, subtype, data)).catch(err => {
    console.error("Error processing write queue:", err);
  });
}

const tempFilePath = "tmp/S3TMPFile.parquet";

/**
 * Fetches the Parquet file from S3 and returns it as an array of records.
 * If the file is missing or corrupt, returns an empty array.
 */
async function fetchParquetFromS3(S3_KEY) {
    try {
      //console.log("\n🔹 Fetching Parquet file from S3...");
  
      const getObjectParams = { Bucket: bucketName, Key: S3_KEY };
      const response = await s3.send(new GetObjectCommand(getObjectParams));
  
      // Convert stream to buffer
      const pipeline = util.promisify(stream.pipeline);
      await pipeline(response.Body, fs.createWriteStream(tempFilePath));
  
      // Read Parquet file
      const reader = await parquet.ParquetReader.openFile(tempFilePath);
      const cursor = reader.getCursor();
      let records = [];
      let record;
  
      //console.log("\n📌 Scanning Parquet file for existing InstanceIds...");
      while ((record = await cursor.next())) {
          records.push(record);
      }
  
      await reader.close();
      return records;
    } catch (err) {
      console.error("⚠️ Error fetching Parquet file from S3. Treating as new file.", err);
      return []; // Return empty list if file doesn't exist or is corrupt
    }
  }

/**
 * Uploads the given Parquet records back to S3.
 * @param {Array} records - Array of JSON objects representing EC2 instances.
 */
async function uploadParquetToS3(schema, records, S3_KEY) {
  try {
    //console.log("\n💾 Writing updated records to Parquet...");

    const writer = await parquet.ParquetWriter.openFile(schema, tempFilePath);
    
    for (const record of records) {
      await writer.appendRow(record);
    }
    await writer.close();

    // Read the written Parquet file
    const fileData = await fs.readFileSync(tempFilePath);

    // Upload file to S3
    const putObjectParams = {
      Bucket: bucketName,
      Key: S3_KEY,
      Body: fileData,
      ContentType: "application/octet-stream",
    };

    await s3.send(new PutObjectCommand(putObjectParams));
    //console.log("✅ Parquet file successfully updated on S3.");
  } catch (err) {
    console.error("❌ Error uploading Parquet file to S3:", err);
  }
}

async function writeS3Data(type, subtype, data) {
    switch (type) {
        case 'asset':
            switch (subtype) {
                case 'EC2':
                    try {
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
                        IfIDs = []
                        for (const networkInterface of data.NetworkInterfaces) {
                            IfIDs.push(networkInterface.NetworkInterfaceId);
                        }
                        const ec2Data = {
                            UniqueId: data.InstanceId, 
                            InstanceId: data.InstanceId, 
                            InstanceType: data.InstanceType, 
                            InstanceState: data.State.Name, 
                            LaunchTime: data.LaunchTime, 
                            PrivateIpAddress: data.PrivateIpAddress, 
                            PublicIpAddress: data.PublicIpAddress, 
                            SubnetId: data.SubnetId, 
                            VpcId: data.VpcId,
                            Architecture: data.Architecure,
                            ClientToken: data.ClientToken,
                            ElasticGpuAssociations: data.ElasticGpuAssociations,
                            ElasticInferenceAcceleratorAssociations: data.ElasticInferenceAcceleratorAssociations,
                            NetworkInterfaces: IfIDs, // for now save only the IfID, later figure out how to store an object
                            CpuOptions: data.CpuOptions.CoreCount * data.CpuOptions.ThreadsPerCore+" threads total",
                            PlatformDetails: data.PlatformDetails
                        }
                        const S3_KEY = 'ec2inventory.parquet';
                        try {
                            let records = await fetchParquetFromS3(S3_KEY);
                        
                            // Check if InstanceId already exists
                
                            const index = records.findIndex(rec => rec.UniqueId === data.InstanceId);
                            if (index !== -1) {
                              //console.log(`Updating existing instance: ${data.InstanceId}`);
                              records[index] = ec2Data; // Update record
                            } else {
                              //console.log(`Adding new instance: ${data.InstanceId}`);
                              records.push(ec2Data); // Insert new record
                            }
                        
                            await uploadParquetToS3(ec2Schema, records, S3_KEY);
                        
                            //console.log('EC2 Parquet file updated successfully.');
                          } catch (err) {
                            console.error('Error writing data to '+subtype+' Parquet file:', err);
                          }
                        } catch (error) {   
                          console.error("Error writing "+subtype+" asset:", error);
                          throw error;
                        }

                    break;
                case 'VPC':
                  try {
                    const VpcSchema = new parquet.ParquetSchema({
                        UniqueId: { type: 'UTF8', optional: false },
                        VpcId: { type: 'UTF8', optional: false },
                        CidrBlock: { type: 'UTF8', optional: false }
                        //tags: { type: 'UTF8', optional: true }*/
                    });
                    const VpcData = {
                      UniqueId: data.VpcId, 
                      VpcId: data.VpcId, 
                      CidrBlock: data.CidrBlock 
                    }
                    const S3_KEY = 'vpcinventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.UniqueId === data.VpcId);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.VpcId}`);
                          records[index] = VpcData; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.VpcId}`);
                          records.push(VpcData); // Insert new record
                        }
                    
                        await uploadParquetToS3(VpcSchema, records, S3_KEY);
                    
                        //console.log('VPC Parquet file updated successfully.');
                      } catch (err) {
                        console.error('Error writing data to '+subtype+' Parquet file:', err);
                      }
                    } catch (error) {   
                      console.error("Error writing "+subtype+" asset:", error);
                      throw error;
                    }

                break;
                case 'S3Bucket':
                  try {
                    //console.log("Received S3Bucket"+JSON.stringify(data))
                    const S3Schema = new parquet.ParquetSchema({
                        UniqueId: { type: 'UTF8', optional: false },
                        Name: { type: 'UTF8', optional: false },
                        CreationDate: { type: 'UTF8', optional: false }
                        //tags: { type: 'UTF8', optional: true }*/
                    });
                    const S3Data = {
                      UniqueId: data.Name, 
                      Name: data.Name, 
                      CreationDate: data.CreationDate 
                    }
                    const S3_KEY = 'S3Bucketinventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.UniqueId === data.Name);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.Name}`);
                          records[index] = S3Data; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.Name}`);
                          records.push(S3Data); // Insert new record
                        }
                    
                        await uploadParquetToS3(S3Schema, records, S3_KEY);
                    
                        //console.log('VPC Parquet file updated successfully.');
                      } catch (err) {
                        console.error('Error writing data to '+subtype+' Parquet file:', err);
                      }
                    } catch (error) {   
                      console.error("Error writing "+subtype+" asset:", error);
                      throw error;
                    }

                break;
                case 'IGW':
                  try {
                    //console.log("Received "+subtype+JSON.stringify(data))
                    const IGWSchema = new parquet.ParquetSchema({
                        UniqueId: { type: 'UTF8', optional: false },
                        InternetGatewayId: { type: 'UTF8', optional: false },
                        VpcId: { type: 'UTF8', optional: true }
                        //tags: { type: 'UTF8', optional: true }*/
                    });
                    const IGWData = {
                      UniqueId: data.InternetGatewayId, 
                      InternetGatewayId: data.InternetGatewayId, 
                      VpcId: data.VpcId 
                    }
                    const S3_KEY = 'IGWBucketinventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.UniqueId === data.InternetGatewayId);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.InternetGatewayId}`);
                          records[index] = IGWData; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.InternetGatewayId}`);
                          records.push(IGWData); // Insert new record
                        }
                    
                        await uploadParquetToS3(IGWSchema, records, S3_KEY);
                    
                      } catch (err) {
                        console.error('Error writing data to '+subtype+' Parquet file:', err);
                      }
                    } catch (error) {   
                        console.error("Error writing "+subtype+" asset:", error);
                        throw error;
                    }
                break;
                case 'SG':
                  try {
                    //console.log("Received "+subtype+JSON.stringify(data))
                    const SGSchema = new parquet.ParquetSchema({
                        UniqueId: { type: 'UTF8', optional: false },
                        GroupId: { type: 'UTF8', optional: false },
                        VpcId: { type: 'UTF8', optional: false }
                        //tags: { type: 'UTF8', optional: true }*/
                    });
                    const SGData = {
                      UniqueId: data.GroupId, 
                      GroupId: data.GroupId, 
                      VpcId: data.VpcId 
                    }
                    const S3_KEY = 'SGBucketinventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.UniqueId === data.GroupId);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.GroupId}`);
                          records[index] = SGData; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.GroupId}`);
                          records.push(SGData); // Insert new record
                        }
                    
                        await uploadParquetToS3(SGSchema, records, S3_KEY);
                    
                      } catch (err) {
                        console.error('Error writing data to '+subtype+' Parquet file:', err);
                      }
                    } catch (error) {   
                        console.error("Error writing "+subtype+" asset:", error);
                        throw error;
                    }
                break;
                case 'NI':
                  try {
                    //console.log("Received "+subtype+JSON.stringify(data))
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
                    const NIData = {
                      UniqueId: data.NetworkInterfaceId, 
                      NetworkInterfaceId: data.NetworkInterfaceId,
                      AvailabilityZone: data.AvailabilityZone,
                      PrivateIpAddress: data.PrivateIpAddress,
                      PublicIp: data.Association ? data.Association.PublicIp : null,
                      Description: data.Description,
                      AttachmentId: data.Attachment ? data.Attachment.AttachmentId : null,
                      InstanceId: data.Attachment ? data.Attachment.InstanceId : null,
                      VpcId: data.VpcId,
                      SubnetId: data.SubnetId,
                      GroupId: data.Groups ? data.Groups.map(group => group.GroupId).join(',') : null
                    }
                    const S3_KEY = 'NIBucketinventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.UniqueId === data.NetworkInterfaceId);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.NetworkInterfaceId}`);
                          records[index] = NIData; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.NetworkInterfaceId}`);
                          records.push(NIData); // Insert new record
                        }
                    
                        await uploadParquetToS3(NISchema, records, S3_KEY);
                    
                      } catch (err) {
                        console.error('Error writing data to '+subtype+' Parquet file:', err);
                      }
                    } catch (error) {   
                        console.error("Error writing "+subtype+" asset:", error);
                        throw error;
                    }

                break;
                case 'Lambda':
                  try {
                    //console.log("Received "+subtype+JSON.stringify(data))
                    const LambdaSchema = new parquet.ParquetSchema({
                        UniqueId: { type: 'UTF8', optional: false },
                        FunctionName: { type: 'UTF8', optional: false },
                        Description: { type: 'UTF8', optional: true },
                        Role: { type: 'UTF8', optional: false }
                        //tags: { type: 'UTF8', optional: true }*/
                    });
                    const LambdaData = {
                      UniqueId: data.FunctionName, 
                      FunctionName: data.FunctionName, 
                      Description: data.Description,
                      Role: data.Role 
                    }
                    const S3_KEY = 'LambdaBucketinventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.UniqueId === data.FunctionName);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.FunctionName}`);
                          records[index] = LambdaData; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.FunctionName}`);
                          records.push(LambdaData); // Insert new record
                        }
                    
                        await uploadParquetToS3(LambdaSchema, records, S3_KEY);
                    
                      } catch (err) {
                        console.error('Error writing data to '+subtype+' Parquet file:', err);
                      }
                    } catch (error) {   
                        console.error("Error writing "+subtype+" asset:", error);
                        throw error;
                    }
                break;
                case 'IAMRole':
                  try {
                    //console.log("Received "+subtype+JSON.stringify(data))
                    const IAMRoleSchema = new parquet.ParquetSchema({
                        UniqueId: { type: 'UTF8', optional: false },
                        RoleId: { type: 'UTF8', optional: false },
                        RoleName: { type: 'UTF8', optional: false },
                        AssumeRolePolicyDocument: { type: 'UTF8', optional: false }
                    });
                    const IAMRoleData = {
                      UniqueId: data.RoleId, 
                      RoleId: data.RoleId, 
                      RoleName: data.RoleName,
                      AssumeRolePolicyDocument: data.AssumeRolePolicyDocument 
                    }
                    const S3_KEY = 'IAMRoleBucketinventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.UniqueId === data.RoleId);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.RoleId}`);
                          records[index] = IAMRoleData; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.RoleId}`);
                          records.push(IAMRoleData); // Insert new record
                        }
                    
                        await uploadParquetToS3(IAMRoleSchema, records, S3_KEY);
                    
                      } catch (err) {
                        console.error('Error writing data to '+subtype+' Parquet file:', err);
                      }
                    } catch (error) {   
                        console.error("Error writing "+subtype+" asset:", error);
                        throw error;
                    }
                break;

                case 'RDS':
                case 'ECS':
                case 'EKS':
                case 'DataBase':
                  console.log("Received "+subtype+JSON.stringify(data))
                  break;
                default:
                    throw new Error(`Unsupported asset subtype: ${subtype}`);
            }
            break;
        case 'log':
            // TBD: Implement log handling
            break;
        default:
            throw new Error(`Unsupported type: ${type}`);
    }

}



module.exports = {
    enqueueS3Write
};
