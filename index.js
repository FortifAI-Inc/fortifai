const detector = require('./src/detector');
const flow_logs = require('./src/flow_logs');
const llm_registry = require('./src/llms_registry');

console.log("Starting Fortifai...");

async function main() {
    try {
        await llm_registry.init();
        await detector.inventoryAWSEnvironment();
        //await flow_logs.collectFlowLogs();
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

main();
