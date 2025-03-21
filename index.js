const EnvInventory = require('./src/Utils/EnvInventory');
const CloudEventListener = require('./src/Utils/CloudEventListener');
const flow_logs = require('./src/flow_logs');
const llm_registry = require('./src/llms_registry');

console.log("Starting Fortifai...");

async function main() {
    while (true) {
        try {
            //await llm_registry.init();
            console.log("Running inventory collection...");
            await EnvInventory.InventoryAssets();
            //await CloudEventListener.startListening()
            //await flow_logs.collectFlowLogs();
            
            // Wait for 1 minute before next iteration
            await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (error) {
            console.error("Error in main function:", error);
            // Wait 1 minute before retrying after error
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
}

main();
