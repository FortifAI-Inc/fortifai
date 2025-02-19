const dns = require('dns');

const llmProviders = {
    "AI21 Labs": "api.ai21.com",
    "Aleph Alpha": "api.aleph-alpha.com",
    //"Amazon Bedrock": "bedrock-runtime.amazonaws.com",
    "Anthropic": "api.anthropic.com",
    "Anyscale": "api.endpoints.anyscale.com",
    "Cohere": "api.cohere.ai",
    //"Databricks": "*.cloud.databricks.com", // This is a per-account addres. TBD
    "DeepInfra": "api.deepinfra.com",
    "DeepSeek": "api.deepseek.com",
    "Eden AI": "api.edenai.run",
    "Fireworks AI": "api.fireworks.ai",
    "Google": "us-central1-aiplatform.googleapis.com",
    "Groq": "api.groq.com",
    "Hugging Face": "api-inference.huggingface.co",
    "Inflection AI": "layercake.pubwestus3.inf7ks8.com",
    //"Meta Llama": "api.meta.com",
    //"Microsoft Azure OpenAI": ".openai.azure.com", // this is a per-account address. TBD
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

function listIPAddresses() {
    for (const [ip, provider] of Object.entries(llmIPRegistry)) {
        console.log(`IP Address: ${ip}, Provider: ${provider}`);
    }
}

// the function resolveDNS receives a domain address as input. it loops 20 times, waiting 1 second between each iteration. on each itteration it uses DNS resolution for the domain
// it will return a list of unique IP addresses obtained from the DNS server
function resolveDNS(domain) {
    const uniqueIPs = new Set();
    for (let i = 0; i < 20; i++) {
        try {
            const addresses = await new Promise((resolve, reject) => {
                dns.resolve4(domain, (err, addresses) => {
                    if (err) reject(err);
                    else resolve(addresses);
                });
            });
            addresses.forEach(ip => uniqueIPs.add(ip));
        } catch (err) {
            console.error(`DNS resolution failed for ${domain}: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return Array.from(uniqueIPs);
}


function init() {
    for (const [provider, address] of Object.entries(llmProviders)) {
        resolveDNS(address).then(ips => {
            ips.forEach(ip => {
                llmIPRegistry[ip] = provider;
            });
        }).catch(err => {
            console.error(`Failed to resolve DNS for ${address}: ${err.message}`);
        });
    }
    console.log("LLM IP registry: \n", llmIPRegistry);
}

function lookupService(ip) {
    return llmIPRegistry[ip] || 'unknown';
}

// Initialize the registry
init();

module.exports = {
    lookupService,
    listIPAddresses, 
    init
};