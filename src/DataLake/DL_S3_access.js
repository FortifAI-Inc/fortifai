const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const parquet = require("parquetjs-lite");
const fs = require("fs");
const stream = require("stream");
const util = require("util");
const path = require("path");

const s3 = new S3Client({ region: "us-east-1" });
const bucketName = "hilikdatalake";

// Map to store write queues per file
const writeQueueMap = new Map();
// Map to track ongoing writes
const writeLocks = new Map();

/**
 * Ensures writes to the same S3 key are queued properly and mutually exclusive with reads.
 */
function enqueueS3Write(schema, records, S3_KEY) {
  if (!writeQueueMap.has(S3_KEY)) {
    writeQueueMap.set(S3_KEY, Promise.resolve());
  }

  const fileQueue = writeQueueMap.get(S3_KEY);

  // Chain the write operation
  const newQueue = fileQueue
    .then(async () => {
      writeLocks.set(S3_KEY, true); // Lock file for writing
      await uploadParquetToS3(schema, records, S3_KEY);
      writeLocks.delete(S3_KEY); // Unlock after writing
    })
    .catch(err => console.error("Error processing write queue for", S3_KEY, ":", err));

  writeQueueMap.set(S3_KEY, newQueue);

  return newQueue;
}

/**
 * Fetches Parquet file from S3 ensuring mutual exclusion with writes.
 */
async function fetchParquetFromS3(S3_KEY) {
  while (writeLocks.get(S3_KEY)) {
    // Wait for any ongoing write operation to finish
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  try {
    const tempFilePath = `tmp/${S3_KEY.replace(/\//g, "_")}.parquet`;

    const getObjectParams = { Bucket: bucketName, Key: S3_KEY };
    const response = await s3.send(new GetObjectCommand(getObjectParams));

    // Convert stream to buffer safely
    const pipeline = util.promisify(stream.pipeline);
    await pipeline(response.Body, fs.createWriteStream(tempFilePath));

    // Read Parquet file
    const reader = await parquet.ParquetReader.openFile(tempFilePath);
    const cursor = reader.getCursor();
    let records = [];
    let record;

    while ((record = await cursor.next())) {
      records.push(record);
    }

    await reader.close();
    return records;
  } catch (err) {
    console.warn("⚠️ File not found or corrupt, treating as new file:", S3_KEY);
    return []; // Return empty list on failure
  }
}

/**
 * Uploads the given Parquet records back to S3 ensuring mutual exclusion.
 */
async function uploadParquetToS3(schema, records, S3_KEY) {
  try {
    const tempFilePath = `tmp/${S3_KEY.replace(/\//g, "_")}.parquet`;

    // Write Parquet file
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

    // Remove temp file
    fs.unlinkSync(tempFilePath);
  } catch (err) {
    console.error("❌ Error uploading Parquet file to S3:", err);
  }
}

module.exports = { enqueueS3Write, fetchParquetFromS3 };