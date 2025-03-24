require('dotenv').config();
const DL_S3_access = require('../DataLake/DL_S3_access');
const OSExplorer = require('../Utils/OSExplorer');
const DL_access = require('../DataLake/DL_access');
const { ec2Schema, VpcSchema, S3Schema, IGWSchema, SGSchema, NISchema, LambdaSchema, IAMRoleSchema, IAMPolicySchema, UserSchema, SubnetSchema } = require('../DataLake/DL_S3_Assets_schema');

class AgentDetection {
    #osExplorer;
    #S3_KEY = 'Assets/ec2inventory.parquet';

    constructor() {
        this.#osExplorer = new OSExplorer("openai");
    }

    async monitorInstances() {
        while (true) {
            try {
                console.log('Starting instance monitoring cycle...');
                
                // Fetch EC2 instances from the datalake
                const records = await DL_S3_access.fetchParquetFromS3(this.#S3_KEY);
                let modified = false;
                console.log(`Retrieved ${records.length} EC2 instances from datalake`);

                // Process each instance
                for (const instance of records) {
                    try {
                        if (instance.InstanceState === 'running') {
                            console.log(`Processing instance ${instance.InstanceId}...`);
                            
                            // Get processes for the instance
                            const processes = await this.#osExplorer.getProcessesViaSSM(instance.InstanceId);
                            
                            // Analyze processes with AI
                            let aiAnalysis = await this.#osExplorer.analyzeProcessesWithAI(processes);
                            // Strip JSON formatting lines if present
                            aiAnalysis = aiAnalysis.replace(/^```json\n/, '').replace(/\n```$/, '');
                            // Parse the AI response
                            const analysis = JSON.parse(aiAnalysis);
                            //console.log('Analysis:', JSON.stringify(analysis, null, 2));
                            
                            // Update instance if AI is detected with high confidence
                            if (analysis.confidence > 0.8 && analysis.isAI) { // This is an agentic workload
                                if ((instance.IsAI === false) || (instance.IsAI === null) || (instance.IsAI === undefined)) {
                                    instance.IsAI = true;
                                    instance.AIDetectionDetails = analysis.confidenceExplanation;
                                    // Write back to datalake only if AI is detected
                                    records[records.findIndex(r => r.InstanceId === instance.InstanceId)] = instance;
                                    modified = true;
                                    console.log(`### Updated instance ${instance.InstanceId} as AI workload`);
                                }
                            } else {
                                if (instance.IsAI === true) {
                                    instance.IsAI = false;
                                    instance.AIDetectionDetails = null;
                                    modified = true;
                                    console.log(`### Updated instance ${instance.InstanceId} as non-AI workload`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing instance ${instance.InstanceId}:`, error);
                        // Continue with next instance
                        continue;
                    }
                }
                if (modified) { // Only write to datalake if there are changes
                    await DL_access.writeData(ec2Schema, records, this.#S3_KEY);
                }

                // Wait for 10 seconds before next iteration
                console.log('Waiting 10 seconds before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                
            } catch (error) {
                console.error('Error in monitoring cycle:', error);
                // Wait for 10 seconds before retrying after error
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }
}

// Main function
async function main() {
    try {
        const detector = new AgentDetection();
        console.log('Starting AI Agent Detection service...');
        await detector.monitorInstances();
    } catch (error) {
        console.error('Fatal error in main:', error);
        process.exit(1);
    }
}

// Run main function if file is executed directly
if (require.main === module) {
    main();
}

module.exports = AgentDetection; 
