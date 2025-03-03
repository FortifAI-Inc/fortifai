const DL_S3_access = require('./DL_S3_access');


// Abstract underlying storage - replace S3 call with DB call if needed.
async function writeData(type, subtype, data) {
  return (DL_S3_access.enqueueS3Write(type, subtype, data))
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
