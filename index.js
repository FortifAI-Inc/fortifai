const detector = require('./src/detector');

console.log("Starting Fortifai...");

async function main() {
    try {
        await detector.inventoryAWSEnvironment();
        await detector.collectFlowLogs();
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

main();