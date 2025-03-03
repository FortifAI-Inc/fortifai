const AWS = require('aws-sdk');
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

/**
 * Fetches the Parquet file from S3 and returns it as an array of records.
 * If the file is missing or corrupt, returns an empty array.
 */
async function fetchParquetFromS3(S3_KEY) {
    try {
      console.log("\n🔹 Fetching Parquet file from S3...");
  
      const getObjectParams = { Bucket: bucketName, Key: S3_KEY };
      const response = await s3.send(new GetObjectCommand(getObjectParams));
  
      // Convert stream to buffer
      const pipeline = util.promisify(stream.pipeline);
      const tempFilePath = "tmp/S3TMP_ec2_instances.parquet";
      await pipeline(response.Body, fs.createWriteStream(tempFilePath));
  
      // Read Parquet file
      const reader = await parquet.ParquetReader.openFile(tempFilePath);
      const cursor = reader.getCursor();
      let records = [];
      let record;
  
      console.log("\n📌 Scanning Parquet file for existing InstanceIds...");
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
      console.log("\n💾 Writing updated records to Parquet...");
  
      const tempFilePath = "tmp/S3TMP_ec2_instances.parquet";
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
      console.log("✅ Parquet file successfully updated on S3.");
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
                            instanceId: { type: 'UTF8', optional: false },
                            instanceType: { type: 'UTF8', optional: true },
                            instanceState: { type: 'UTF8', optional: true },
                            launchTime: { type: 'UTF8', optional: true },
                            privateIpAddress: { type: 'UTF8', optional: true },
                            publicIpAddress: { type: 'UTF8', optional: true },
                            subnetId: { type: 'UTF8', optional: true },
                            vpcId: { type: 'UTF8', optional: true },
                            architecture: { type: 'UTF8', optional: true},
                            clientToke: { type: 'UTF8', optional: true},
                            elasticGpuAssociations: { type: 'UTF8', optional: true},
                            elasticInferenceAcceleratorAssociations: { type: 'UTF8', optional: true},
                            networkInterfaces: { type: 'UTF8', repeated: true}, // for now save only the IfID, later figure out how to store an object
                            cpuOptions: { type: 'UTF8', optional: true},
                            platformDetails: { type: 'UTF8', optional: true},
                            /*,
                            securityGroups: { type: 'UTF8', optional: true },
                            tags: { type: 'UTF8', optional: true }*/
                        });
                        IfIDs = []
                        for (const networkInterface of data.NetworkInterfaces) {
                            IfIDs.push(networkInterface.NetworkInterfaceId);
                        }
                        const ec2Data = {instanceId: data.InstanceId, 
                            instanceType: data.InstanceType, 
                            instanceState: data.State.Name, 
                            launchTime: data.LaunchTime, 
                            privateIpAddress: data.PrivateIpAddress, 
                            publicIpAddress: data.PublicIpAddress, 
                            subnetId: data.SubnetId, 
                            vpcId: data.VpcId,
                            architecture: data.Architecure,
                            clientToken: data.ClientToken,
                            elasticGpuAssociations: data.ElasticGpuAssociations,
                            elasticInferenceAcceleratorAssociations: data.ElasticInferenceAcceleratorAssociations,
                            networkInterfaces: IfIDs, // for now save only the IfID, later figure out how to store an object
                            cpuOptions: data.CpuOptions.CoreCount * data.CpuOptions.ThreadsPerCore+" threads total",
                            platformDetails: data.PlatformDetails
                        }
                        const S3_KEY = 'ec2inventory.parquet';
                        try {
                            let records = await fetchParquetFromS3(S3_KEY);
                        
                            // Check if InstanceId already exists
                
                            const index = records.findIndex(rec => rec.instanceId === data.InstanceId);
                            if (index !== -1) {
                              console.log(`Updating existing instance: ${data.InstanceId}`);
                              records[index] = ec2Data; // Update record
                            } else {
                              console.log(`Adding new instance: ${data.InstanceId}`);
                              records.push(ec2Data); // Insert new record
                            }
                        
                            await uploadParquetToS3(ec2Schema, records, S3_KEY);
                        
                            console.log('Parquet file updated successfully.');
                          } catch (err) {
                            console.error('Error writing data to Parquet file:', err);
                          }
                        } catch (error) {   
                            console.error("Error writing EC2 asset:", error);
                            throw error;
                        }

                    break;
                case 'VPC':
                  try {
                    console.log("Writing VPC asset to S3...");
                    console.log("Received data is "+data)
                    break;
                    const vpcSchema = new parquet.ParquetSchema({
                        instanceId: { type: 'UTF8', optional: false },
                        instanceType: { type: 'UTF8', optional: true },
                        instanceState: { type: 'UTF8', optional: true },
                        launchTime: { type: 'UTF8', optional: true },
                        privateIpAddress: { type: 'UTF8', optional: true },
                        publicIpAddress: { type: 'UTF8', optional: true },
                        subnetId: { type: 'UTF8', optional: true },
                        vpcId: { type: 'UTF8', optional: true },
                        architecture: { type: 'UTF8', optional: true},
                        clientToke: { type: 'UTF8', optional: true},
                        elasticGpuAssociations: { type: 'UTF8', optional: true},
                        elasticInferenceAcceleratorAssociations: { type: 'UTF8', optional: true},
                        networkInterfaces: { type: 'UTF8', repeated: true}, // for now save only the IfID, later figure out how to store an object
                        cpuOptions: { type: 'UTF8', optional: true},
                        platformDetails: { type: 'UTF8', optional: true},
                        /*,
                        securityGroups: { type: 'UTF8', optional: true },
                        tags: { type: 'UTF8', optional: true }*/
                    });
                    IfIDs = []
                    for (const networkInterface of data.NetworkInterfaces) {
                        IfIDs.push(networkInterface.NetworkInterfaceId);
                    }
                    const ec2Data = {instanceId: data.InstanceId, 
                        instanceType: data.InstanceType, 
                        instanceState: data.State.Name, 
                        launchTime: data.LaunchTime, 
                        privateIpAddress: data.PrivateIpAddress, 
                        publicIpAddress: data.PublicIpAddress, 
                        subnetId: data.SubnetId, 
                        vpcId: data.VpcId,
                        architecture: data.Architecure,
                        clientToken: data.ClientToken,
                        elasticGpuAssociations: data.ElasticGpuAssociations,
                        elasticInferenceAcceleratorAssociations: data.ElasticInferenceAcceleratorAssociations,
                        networkInterfaces: IfIDs, // for now save only the IfID, later figure out how to store an object
                        cpuOptions: data.CpuOptions.CoreCount * data.CpuOptions.ThreadsPerCore+" threads total",
                        platformDetails: data.PlatformDetails
                    }
                    const S3_KEY = 'ec2inventory.parquet';
                    try {
                        let records = await fetchParquetFromS3(S3_KEY);
                    
                        // Check if InstanceId already exists
            
                        const index = records.findIndex(rec => rec.instanceId === data.InstanceId);
                        if (index !== -1) {
                          console.log(`Updating existing instance: ${data.InstanceId}`);
                          records[index] = ec2Data; // Update record
                        } else {
                          console.log(`Adding new instance: ${data.InstanceId}`);
                          records.push(ec2Data); // Insert new record
                        }
                    
                        await uploadParquetToS3(ec2Schema, records, S3_KEY);
                    
                        console.log('Parquet file updated successfully.');
                      } catch (err) {
                        console.error('Error writing data to Parquet file:', err);
                      }
                    } catch (error) {   
                        console.error("Error writing EC2 asset:", error);
                        throw error;
                    }

                break;

                case 'S3Bucket':
                case 'SG':
                case 'ECS':
                case 'EKS':
                case 'Lambda':
                case 'DataBase':
                case 'InternetGateway':
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
