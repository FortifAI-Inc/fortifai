const AWS = require('aws-sdk');
const parquet = require('parquetjs-lite');
const fileContent = require('fs').readFileSync('tmp/temp.parquet');

const s3 = new AWS.S3();

const bucketName = 'hilikdatalake';

async function writeData(type, subtype, data) {
    const schema = new parquet.ParquetSchema({
        type: { type: 'UTF8' },
        subtype: { type: 'UTF8', optional: true },
        data: { type: 'JSON' }
    });

    const writer = await parquet.ParquetWriter.openFile(schema, 'tmp/temp.parquet');

    switch (type) {
        case 'asset':
            switch (subtype) {
                case 'EC2':
                    try {
                        const parquetFilePath = 'assets/compute/ec2/inventory.parquet';
                        
                        // Download the existing parquet file from S3
                        const params = {
                            Bucket: bucketName,
                            Key: parquetFilePath
                        };
                        let existingFile;
                        try {
                            existingFile = await s3.getObject(params).promise();
                            if (existingFile.ContentLength === 0) {
                                console.log("File exists but is empty, initializing new file.");
                                await writer.appendRow({
                                    type: type,
                                    subtype: subtype,
                                    data: JSON.stringify(data)
                                });
                                await writer.close();
                                const uploadParams = {
                                    Bucket: bucketName,
                                    Key: parquetFilePath,
                                    Body: require('fs').readFileSync('tmp/temp.parquet')
                                };
                                await s3.putObject(uploadParams).promise();
                                exit;
                            }
                        } catch (error) {
                            if (error.code === 'NoSuchKey') {
                                console.log("File does not exist, initializing new file.");
                                await writer.appendRow({
                                    type: type,
                                    subtype: subtype,
                                    data: JSON.stringify(data)
                                });
                                await writer.close();
                                const uploadParams = {
                                    Bucket: bucketName,
                                    Key: parquetFilePath,
                                    Body: require('fs').readFileSync('tmp/temp.parquet')
                                };
                                await s3.putObject(uploadParams).promise();
                                return;
                            } else {
                                throw error;
                            }
                        }
                        const reader = await parquet.ParquetReader.openBuffer(existingFile.Body);
                        const cursor = reader.getCursor();
                        let record = null;
                        let instanceExists = false;

                        // Check if the instance ID already exists
                        while (record = await cursor.next()) {
                            if (record.data && JSON.parse(record.data).InstanceId === data.InstanceId) {
                                console.log("Instance already exists: " + data.InstanceId);
                                instanceExists = true;
                                break;
                            }
                        }
                        await reader.close();

                        // If the instance ID does not exist, append the new data
                        if (!instanceExists) {
                            console.log("Adding new instance to data lake: " + data.InstanceId);
                            await writer.appendRow({
                                type: type,
                                subtype: subtype,
                                data: JSON.stringify(data)
                            });
                        }
                    } catch (error) {
                        console.error("Error processing EC2 data: ", error);
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

    await writer.close();

    const params = {
        Bucket: bucketName,
        Key: parquetFilePath,
        Body: fileContent
    };

    await s3.putObject(params).promise();
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