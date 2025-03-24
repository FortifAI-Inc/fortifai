const { Configuration, OpenAIApi } = require('openai');

class LLMAPI {
    #configuration;
    #openai;
    #maxTokensPerChunk = 40000;
    #maxRetries = 3;
    #retryDelay = 1000; // Start with 1 second delay
    #model = "gpt-4o"; // Default model, can be changed via constructor

    constructor(apiKey) {
        this.#configuration = new Configuration({
            apiKey: apiKey
        });
        this.#openai = new OpenAIApi(this.#configuration);
    }

    // Helper method to split text into chunks
    #splitIntoChunks(text, maxChunkSize = 40000) {
        const chunks = [];
        const lines = text.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            if ((currentChunk + line).length > maxChunkSize) {
                chunks.push(currentChunk);
                currentChunk = line;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        return chunks;
    }

    async #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #retryWithExponentialBackoff(operation) {
        let retries = 0;
        let lastError;

        while (retries < this.#maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (error.response?.status === 429) {
                    retries++;
                    const delayTime = this.#retryDelay * Math.pow(2, retries); // Exponential backoff
                    console.log(`Rate limited. Retrying in ${delayTime/1000} seconds... (Attempt ${retries}/${this.#maxRetries})`);
                    await this.#delay(delayTime);
                } else {
                    throw error; // If it's not a rate limit error, throw immediately
                }
            }
        }
        throw lastError;
    }

    async askWithAttachment(prompt, attachment) {
        try {
            const chunks = this.#splitIntoChunks(attachment);
            let finalResponse = '';

            //console.log(`Processing attachment in ${chunks.length} chunks...`);

            // Process each chunk separately
            for (let i = 0; i < chunks.length; i++) {
                const progress = ((i + 1) / chunks.length * 100).toFixed(1);
                //console.log(`Processing chunk ${i + 1}/${chunks.length} (${progress}%)`);

                const combinedPrompt = `
Context/Attachment (Part ${i + 1}/${chunks.length}):
${chunks[i]}
<CURRENT_CURSOR_POSITION>

${i === chunks.length - 1 ? `Question/Prompt:
${prompt}` : 'Please analyze this part of the context and maintain relevant information for the final response.'}`;

                const response = await this.#retryWithExponentialBackoff(async () => {
                    return await this.#openai.createChatCompletion({
                        model: "gpt-4o",
                        messages: [
                            {
                                role: "user",
                                content: combinedPrompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 2000
                    });
                });

                if (i === chunks.length - 1) {
                    finalResponse = response.data.choices[0].message.content;
                }

                // Add a small delay between chunks to avoid rate limits
                if (i < chunks.length - 1) {
                    await this.#delay(1000);
                }
            }

            //console.log('Finished processing all chunks');

            return {
                success: true,
                response: finalResponse,
                usage: { total_tokens: 'Multiple requests made' }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error.response?.data || 'No additional details available'
            };
        }
    }
}

class DeepSeekAPI {
    #apiKey;
    #maxTokensPerChunk = 40000;
    #maxRetries = 3;
    #retryDelay = 1000; // Start with 1 second delay
    #model = "deepseek-chat"; // Default model

    constructor(apiKey) {
        this.#apiKey = apiKey;
    }

    // Helper method to split text into chunks
    #splitIntoChunks(text, maxChunkSize = 40000) {
        const chunks = [];
        const lines = text.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            if ((currentChunk + line).length > maxChunkSize) {
                chunks.push(currentChunk);
                currentChunk = line;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        return chunks;
    }

    async #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #retryWithExponentialBackoff(operation) {
        let retries = 0;
        let lastError;

        while (retries < this.#maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (error.response?.status === 429) {
                    retries++;
                    const delayTime = this.#retryDelay * Math.pow(2, retries); // Exponential backoff
                    console.log(`Rate limited. Retrying in ${delayTime/1000} seconds... (Attempt ${retries}/${this.#maxRetries})`);
                    await this.#delay(delayTime);
                } else {
                    throw error; // If it's not a rate limit error, throw immediately
                }
            }
        }
        throw lastError;
    }

    async askWithAttachment(prompt, attachment) {
        try {
            const chunks = this.#splitIntoChunks(attachment);
            let finalResponse = '';

            console.log(`Processing attachment in ${chunks.length} chunks...`);

            // Process each chunk separately
            for (let i = 0; i < chunks.length; i++) {
                const progress = ((i + 1) / chunks.length * 100).toFixed(1);
                console.log(`Processing chunk ${i + 1}/${chunks.length} (${progress}%)`);

                const combinedPrompt = `
Context/Attachment (Part ${i + 1}/${chunks.length}):
${chunks[i]}
<CURRENT_CURSOR_POSITION>

${i === chunks.length - 1 ? `Question/Prompt:
${prompt}` : 'Please analyze this part of the context and maintain relevant information for the final response.'}`;

                const response = await this.#retryWithExponentialBackoff(async () => {
                    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.#apiKey}`
                        },
                        body: JSON.stringify({
                            model: this.#model,
                            messages: [
                                {
                                    role: "user",
                                    content: combinedPrompt
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 2000
                        })
                    });
                    return await res.json();
                });

                if (i === chunks.length - 1) {
                    finalResponse = response.choices[0].message.content;
                }

                // Add a small delay between chunks to avoid rate limits
                if (i < chunks.length - 1) {
                    await this.#delay(1000);
                }
            }

            console.log('Finished processing all chunks');

            return {
                success: true,
                response: finalResponse,
                usage: { total_tokens: 'Multiple requests made' }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error.response?.data || 'No additional details available'
            };
        }
    }
}

class LlamaAPI {
    #apiUrl;
    #maxTokensPerChunk = 40000;
    #maxRetries = 3;
    #retryDelay = 1000;
    #model = "llama3.2"; // Default model name for local Llama instance

    constructor(apiUrl = 'http://127.0.0.1:11434') {
        this.#apiUrl = apiUrl;
    }

    // Helper method to split text into chunks
    #splitIntoChunks(text, maxChunkSize = 40000) {
        const chunks = [];
        const lines = text.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            if ((currentChunk + line).length > maxChunkSize) {
                chunks.push(currentChunk);
                currentChunk = line;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        return chunks;
    }

    async #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #retryWithExponentialBackoff(operation) {
        let retries = 0;
        let lastError;

        while (retries < this.#maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (error.response?.status === 429) {
                    retries++;
                    const delayTime = this.#retryDelay * Math.pow(2, retries);
                    console.log(`Rate limited. Retrying in ${delayTime/1000} seconds... (Attempt ${retries}/${this.#maxRetries})`);
                    await this.#delay(delayTime);
                } else {
                    throw error;
                }
            }
        }
        throw lastError;
    }

    async askWithAttachment(prompt, attachment) {
        try {
            const chunks = this.#splitIntoChunks(attachment);
            let finalResponse = '';

            console.log(`Processing attachment in ${chunks.length} chunks...`);

            // Process each chunk separately
            for (let i = 0; i < chunks.length; i++) {
                const progress = ((i + 1) / chunks.length * 100).toFixed(1);
                console.log(`Processing chunk ${i + 1}/${chunks.length} (${progress}%)`);

                const combinedPrompt = `
Context/Attachment (Part ${i + 1}/${chunks.length}):
${chunks[i]}
<CURRENT_CURSOR_POSITION>

${i === chunks.length - 1 ? `Question/Prompt:
${prompt}` : 'Please analyze this part of the context and maintain relevant information for the final response.'}`;

                const response = await this.#retryWithExponentialBackoff(async () => {
                    const res = await fetch(`${this.#apiUrl}/api/chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: this.#model,
                            messages: [
                                {
                                    role: "user",
                                    content: combinedPrompt
                                }
                            ],
                            stream: false,
                            temperature: 0.7,
                            max_tokens: 2000
                        })
                    });

                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return await res.json();
                });

                if (i === chunks.length - 1) {
                    finalResponse = response.message.content;
                }

                // Add a small delay between chunks to avoid overloading
                if (i < chunks.length - 1) {
                    await this.#delay(1000);
                }
            }

            console.log('Finished processing all chunks');

            return {
                success: true,
                response: finalResponse,
                usage: { total_tokens: 'Multiple requests made' }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error.response?.data || 'No additional details available'
            };
        }
    }
}

module.exports = { LLMAPI, DeepSeekAPI, LlamaAPI };
