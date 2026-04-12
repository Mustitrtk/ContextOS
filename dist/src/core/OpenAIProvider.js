"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class OpenAIProvider {
    constructor(apiKey, model = 'gpt-4') {
        this.apiKey = apiKey;
        this.model = model;
        if (!this.apiKey) {
            throw new Error('OpenAI API key is missing.');
        }
    }
    getName() {
        return 'openai';
    }
    async generateCompletion(systemMessage, userPrompt) {
        try {
            const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: this.model,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userPrompt },
                ],
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            const choice = response.data.choices[0];
            const usage = response.data.usage;
            return {
                content: choice.message.content.trim(),
                usage: usage ? {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                } : undefined,
            };
        }
        catch (error) {
            const message = error.response?.data?.error?.message || error.message;
            throw new Error(`OpenAI API request failed: ${message}`);
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
