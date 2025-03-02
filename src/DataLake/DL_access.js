const AWS = require('aws-sdk');
const hyparquet = require('hyparquet');
const fs = require('fs');
//const fileContent = require('fs').readFileSync('tmp/temp.parquet');

const s3 = new AWS.S3();

const bucketName = 'hilikdatalake';

async function writeData(type, subtype, data) {


    const writer = await ('tmp/temp.parquet', schema);

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

                        let writer;
                        /*if (fs.existsSync(filePath) && fs.statSync(filePath).size > 4) {
                            const reader = await parquet.ParquetReader.openFile(filePath);
                            const cursor = reader.getCursor();
                            let record = null;
                            let exists = false;

                            while (record = await cursor.next()) {
                                if (record.instanceId === data.InstanceId) {
                                    exists = true;
                                    break;
                                }
                            }

                            await reader.close();

                            if (exists) {
                                return; // InstanceId already exists, no need to append
                            }

                            writer = await parquet.ParquetWriter.openFile(ec2Schema, filePath);
                        } else */{
                            writer = await hyparquet.writer.openFile(filePath,ec2Schema);
                        }

                        await writer.appendRow({
                            instanceId: data.InstanceId,
                            instanceType: data.InstanceType,
                            instanceState: data.InstanceState,
                            launchTime: data.LaunchTime,
                            privateIpAddress: data.PrivateIpAddress,
                            publicIpAddress: data.PublicIpAddress,
                            subnetId: data.SubnetId,
                            vpcId: data.VpcId,
                            securityGroups: JSON.stringify(data.SecurityGroups),
                            tags: JSON.stringify(data.Tags)
                        });

                        await writer.close();
                    } catch (error) {
                        console.error(`Error processing EC2 data: ${error.message}`);
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