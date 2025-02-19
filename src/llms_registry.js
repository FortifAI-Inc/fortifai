const dns = require('dns');

const llmProviders = {
    "AI21 Labs": "api.ai21.com",
    "Aleph Alpha": "api.aleph-alpha.com",
    "Amazon Bedrock": "bedrock-runtime.amazonaws.com",
    "Anthropic": "api.anthropic.com",
    "Anyscale": "api.endpoints.anyscale.com",
    "Cohere": "api.cohere.ai",
    "Databricks": "*.cloud.databricks.com", // This is a per-account addres. TBD
    "DeepInfra": "api.deepinfra.com",
    "DeepSeek": "api.deepseek.com",
    "Eden AI": "api.edenai.co",
    "Fireworks AI": "api.fireworks.ai",
    "Google": "us-central1-aiplatform.googleapis.com",
    "Groq": "api.groq.com",
    "Hugging Face": "api-inference.huggingface.co",
    "Inflection AI": "api.inflection.ai",
    "Meta Llama": "api.meta.com",
    "Microsoft Azure OpenAI": ".openai.azure.com", // this is a per-account address. TBD
    "Mistral AI": "api.mistral.ai",
    "MosaicML": "api.mosaicml.com",
    "NVIDIA": "api.nvidia.com",
    "OpenAI": "api.openai.com",
    "Perplexity": "api.perplexity.ai",
    "Replicate": "api.replicate.com",
    "Scale AI": "api.scale.com",
    "Stability AI": "api.stability.ai",
    "Together.ai": "api.together.xyz",
    "xAI": "api.x.ai"
};

const llmIPRegistry = {};

function init() {
    for (const [provider, address] of Object.entries(llmProviders)) {
        dns.lookup(address, (err, ip) => {
            if (err) {
                console.error(`DNS lookup failed for ${address}: ${err.message}`);
            } else {
                llmIPRegistry[ip] = provider;
            }
        });
    }
}

function lookupService(ip) {
    return llmIPRegistry[ip] || 'unknown';
}

// Initialize the registry
init();

module.exports = {
    lookupService, 
    init
};