"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class AnthropicProvider {
    constructor(apiKey, model = 'claude-3-opus-20240229') {
        this.apiKey = apiKey;
        this.model = model;
        if (!this.apiKey) {
            throw new Error('Anthropic API key is missing.');
        }
    }
    getName() {
        return 'anthropic';
    }
    async generateCompletion(systemMessage, userPrompt) {
        try {
            const response = await axios_1.default.post('https://api.anthropic.com/v1/messages', {
                model: this.model,
                max_tokens: 4096,
                system: systemMessage,
                messages: [
                    { role: 'user', content: userPrompt },
                ],
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
            });
            const content = response.data.content[0].text;
            const usage = response.data.usage;
            return {
                content,
                usage: usage ? {
                    promptTokens: usage.input_tokens,
                    completionTokens: usage.output_tokens,
                    totalTokens: usage.input_tokens + usage.output_tokens,
                } : undefined,
            };
        }
        catch (error) {
            const message = error.response?.data?.error?.message || error.message;
            throw new Error(`Anthropic API request failed: ${message}`);
        }
    }
}
exports.AnthropicProvider = AnthropicProvider;
