const parquet = require('parquetjs-lite');
const fs = require('fs');
const stream = require("stream");
const util = require("util");

const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require('path');
const s3 = new S3Client( {region: "us-east-1"} );

const bucketName = 'hilikdatalake';



// Queue to serialize write operations
let writeQueue = Promise.resolve();


/**
 * Adds a write operation to the queue to ensure writes are serialized.
 * @param {Object} schema - Parquet schema.
 * @param {Array} records - Array of JSON objects representing records.
 * @param {string} S3_KEY - S3 key for the Parquet file.
 */
function enqueueS3Write(schema, records, S3_KEY) {
  writeQueue = writeQueue.then(() => uploadParquetToS3(schema, records, S3_KEY)).catch(err => {
    console.error("Error processing write queue:", err);
  });
  return writeQueue; // Ensure the promise is returned
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

/**
 * Writes log data to S3 with partitioning based on timestamps.
 * @param {Object} commonSchema - Parquet schema for common fields.
 * @param {Object} commonData - JSON object matching the common schema.
 * @param {Object} eventSchema - Parquet schema for event-specific fields.
 * @param {Object} eventData - JSON object matching the event schema.
 */
async function writeS3Log(commonSchema, commonData, eventSchema, eventData) {
  const timestamp = new Date(commonData.Timestamp);
  const year = timestamp.getUTCFullYear();
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getUTCDate()).padStart(2, '0');
  const hour = String(timestamp.getUTCHours()).padStart(2, '0');
  const eventName = commonData.EventName;

  const partitionPath = path.join('EventLogger', year, month, day, hour);
  const commonFilePath = path.join(partitionPath, 'common.parquet');
  const eventFilePath = path.join(partitionPath, `${eventName}.parquet`);

  await enqueueS3Write(commonSchema, [commonData], commonFilePath);
  await enqueueS3Write(eventSchema, [eventData], eventFilePath);
}

async function writeS3Logs(schema, data, filePath) {
  if (type === 'log') {
    try {
      let records = await fetchParquetFromS3(filePath);
      records.push(data);
      await uploadParquetToS3(schema, records, filePath);
    } catch (err) {
      console.error(`Error writing log data to ${subtype} Parquet file:`, err);
    }
  } else {
    // existing asset handling code
  }
}

module.exports = {
  enqueueS3Write,
  fetchParquetFromS3,
  writeS3Log
};
