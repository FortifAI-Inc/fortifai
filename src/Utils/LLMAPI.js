const { Configuration, OpenAIApi } = require('openai');

class LLMAPI {
    #configuration;
    #openai;

    constructor(apiKey) {
        this.#configuration = new Configuration({
            apiKey: apiKey
        });
        this.#openai = new OpenAIApi(this.#configuration);
    }

    async askWithAttachment(prompt, attachment) {
        try {
            const combinedPrompt = `
Context/Attachment:
${attachment}

Question/Prompt:
${prompt}

Please provide a response taking into account both the context/attachment and the specific question/prompt above.`;

            const response = await this.#openai.createChatCompletion({
                model: "gpt-4", // Can be configured based on needs
                messages: [
                    {
                        role: "user",
                        content: combinedPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            return {
                success: true,
                response: response.data.choices[0].message.content,
                usage: response.data.usage
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
