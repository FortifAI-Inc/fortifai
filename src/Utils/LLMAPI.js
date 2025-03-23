const { Configuration, OpenAIApi } = require('openai');

class LLMAPI {
    #configuration;
    #openai;
    #maxTokensPerChunk = 40000; // Adjustable based on needs
    #model = "gpt-4o"; // Default model, can be changed via constructor

    constructor(apiKey) {
        this.#configuration = new Configuration({
            apiKey: apiKey
        });
        this.#openai = new OpenAIApi(this.#configuration);
    }

    // Helper method to split text into chunks
    #splitIntoChunks(text, maxChunkSize = 4000) {
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

    async askWithAttachment(prompt, attachment) {
        try {
            const chunks = this.#splitIntoChunks(attachment);
            let finalResponse = '';

            // Process each chunk separately
            for (let i = 0; i < chunks.length; i++) {
                const combinedPrompt = `
Context/Attachment (Part ${i + 1}/${chunks.length}):
${chunks[i]}
<CURRENT_CURSOR_POSITION>

${i === chunks.length - 1 ? `Question/Prompt:
${prompt}` : 'Please analyze this part of the context and maintain relevant information for the final response.'}`;

                const response = await this.#openai.createChatCompletion({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "user",
                            content: combinedPrompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                });

                if (i === chunks.length - 1) {
                    finalResponse = response.data.choices[0].message.content;
                }
            }

            return {
                success: true,
                response: finalResponse,
                usage: { total_tokens: 'Multiple requests made' } // Actual token counting would need to be implemented
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

module.exports = LLMAPI;
