const dns = require('dns');

const llmProviders = {
    "OpenAI": "api.openai.com",
    "Anthropic": "api.anthropic.com",
    "Google": "us-central1-aiplatform.googleapis.com",
    "Microsoft Azure OpenAI": ".openai.azure.com", // this is a per-account address. TBD
    "Cohere": "api.cohere.ai",
    "AI21 Labs": "api.ai21.com",
    "Hugging Face": "api-inference.huggingface.co",
    "Amazon Bedrock": "bedrock-runtime.amazonaws.com",
    "Mistral AI": "api.mistral.ai",
    "Groq": "api.groq.com",
    "Scale AI": "api.scale.com",
    "Meta Llama": "api.meta.com",
    "NVIDIA": "api.nvidia.com",
    "Together.ai": "api.together.xyz",
    "DeepInfra": "api.deepinfra.com",
    "Replicate": "api.replicate.com",
    "Perplexity": "api.perplexity.ai",
    "Anyscale": "api.endpoints.anyscale.com",
    "Databricks": "*.cloud.databricks.com", // This is a per-account addres. TBD
    "Inflection AI": "api.inflection.ai",
    "xAI": "api.x.ai",
    "Eden AI": "api.edenai.co",
    "Stability AI": "api.stability.ai",
    "Fireworks AI": "api.fireworks.ai",
    "Aleph Alpha": "api.aleph-alpha.com",
    "MosaicML": "api.mosaicml.com",
    "DeepSeek": "api.deepseek.com"
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