const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const parquet = require("parquetjs-lite");
const fs = require("fs");
const stream = require("stream");
const util = require("util");
const path = require("path");

const EnvRegion = 'eu-north-1'  // TODO: make this configurable from env variable
//const EnvRegion = 'us-east-1'
const s3 = new S3Client({ region: EnvRegion });
const bucketName = "fortifaidatalake";

// Map to store write queues per file
const writeQueueMap = new Map();
// Map to track ongoing writes
const writeLocks = new Map();

/**
 * Ensures writes to the same S3 key are queued properly and mutually exclusive with reads.
 */
async function enqueueS3Write(schema, records, S3_KEY) {
  if (!writeQueueMap.has(S3_KEY)) {
    writeQueueMap.set(S3_KEY, Promise.resolve());
  }

  const fileQueue = writeQueueMap.get(S3_KEY);
  // Chain the write operation
  const newQueue = fileQueue
    .then(async () => {
      writeLocks.set(S3_KEY, true); // Lock file for writing
      await uploadParquetToS3(schema, records, S3_KEY);
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure file system flush
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
  // Wait for any ongoing write operation to finish
  while (writeLocks.get(S3_KEY)) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Set read lock
  writeLocks.set(S3_KEY, true);

  try {
    const tempFilePath = `tmp/${S3_KEY.replace(/\//g, "_")}.parquet`;

    const getObjectParams = { Bucket: bucketName, Key: S3_KEY };
    const response = await s3.send(new GetObjectCommand(getObjectParams));

    // Convert stream to buffer safely
    const pipeline = util.promisify(stream.pipeline);
    await pipeline(response.Body, fs.createWriteStream(tempFilePath));

    // Wait a bit to ensure the file system writes are fully committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Read Parquet file
    const reader = await parquet.ParquetReader.openFile(tempFilePath);
    const cursor = reader.getCursor();
    let records = [];
    let record;

    while ((record = await cursor.next())) {
      records.push(record);
    }

    await reader.close();
    writeLocks.delete(S3_KEY); // Release lock after reading
    return records;
  } catch (err) {
    writeLocks.delete(S3_KEY); // Release lock on error
    if (err.name === "NoSuchKey") {
      //console.warn("⚠️ File not found on S3, treating as new file:", S3_KEY);
      return []; // Return empty list if file does not exist
    }
    console.warn("⚠️ File not found or corrupt, treating as new file:", S3_KEY,err);
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

    // Ensure the file is fully written before reading it back
    await new Promise(resolve => setTimeout(resolve, 100));

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

    // Ensure the upload is completed before allowing a read
    await new Promise(resolve => setTimeout(resolve, 100));

    // Remove temp file
    fs.unlinkSync(tempFilePath);
  } catch (err) {
    console.error("❌ Error uploading Parquet file to S3:",S3_KEY, err);
  }
}
async function addAssetTypeToDirectory(AssetType, AssetTable) {
  const schema = AssetDirectorySchema;
  const records = [];
  const S3_KEY = `Assets/AssetDirectory.parquet`;
  records = await fetchParquetFromS3(S3_KEY);
  const index = records.findIndex(rec => rec.AssetType === AssetType);
  if (index !== -1) {
    records[index].AssetTable = AssetTable;
  } else {
    records.push({ AssetType: AssetType, AssetTable: AssetTable });
  }
  await enqueueS3Write(schema, records, S3_KEY);
}

module.exports = { enqueueS3Write, fetchParquetFromS3, addAssetTypeToDirectory };