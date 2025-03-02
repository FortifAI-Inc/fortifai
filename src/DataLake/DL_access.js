const AWS = require('aws-sdk');
const parquet = require('parquetjs-lite');
const fs = require('fs');
//const fileContent = require('fs').readFileSync('tmp/temp.parquet');

const s3 = new AWS.S3();

const bucketName = 'hilikdatalake';

async function writeData(type, subtype, data) {


    //const writer = await ('tmp/temp.parquet', schema);

    switch (type) {
        case 'asset':
            switch (subtype) {
                case 'EC2':
                    try {
                        const ec2Schema = {
                            instanceId: { type: 'string' },
                            instanceType: { type: 'string' },
                            instanceState: { type: 'string' },
                            launchTime: { type: 'string' },
                            privateIpAddress: { type: 'string' },
                            publicIpAddress: { type: 'string' },
                            subnetId: { type: 'string' },
                            vpcId: { type: 'string' },
                            securityGroups: { type: 'string' },
                            tags: { type: 'string' }
                        };
                        const filePath = 'tmp/ec2inventory.parquet';
                        try {
                            let records = [];
                        
                            // Check if file exists
                            if (fs.existsSync(filePath)) {
                              try {
                                const reader = await parquet.ParquetReader.openFile(filePath);
                                const cursor = reader.getCursor();
                                let record;
                        
                                // Read existing records into an array
                                while ((record = await cursor.next())) {
                                  records.push(record);
                                }
                                await reader.close();
                              } catch (err) {
                                console.error('Error reading existing Parquet file (corrupt or empty). Recreating file.', err);
                                records = []; // Treat file as new
                              }
                            }
                        
                            // Check if InstanceId already exists
                            const index = records.findIndex(rec => rec.InstanceId === data.InstanceId);
                            if (index !== -1) {
                              console.log(`Updating existing instance: ${data.InstanceId}`);
                              records[index] = data; // Update record
                            } else {
                              console.log(`Adding new instance: ${data.InstanceId}`);
                              records.push(data); // Insert new record
                            }
                        
                            // Write data back to Parquet file
                            const writer = await parquet.ParquetWriter.openFile(ec2Schema, filePath);
                            for (const record of records) {
                              await writer.appendRow(record);
                            }
                            await writer.close();
                        
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
                case 'VPC':
                case 'ECS':
                case 'EKS':
                case 'Lambda':
                case 'DataBase':
                case 'InternetGateway':
                    await writer.appendRow({
                        type: type,
                        subtype: subtype,
                        data: JSON.stringify(data)
                    });
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

async function readData() {
    // Implementation for reading data from Parquet file in S3
}

async function queryData(query) {
    // Implementation for querying data from Parquet file in S3
}

async function getDataStatistics() {
    // Implementation for getting data statistics from Parquet file in S3
}

module.exports = {
    writeData,
    readData,
    queryData,
    getDataStatistics
};