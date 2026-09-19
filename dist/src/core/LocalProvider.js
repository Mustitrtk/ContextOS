"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalProvider = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * A provider for local or self-hosted LLMs that follow the OpenAI API format (e.g., LM Studio, Ollama, vLLM).
 */
class LocalProvider {
    constructor(baseUrl = 'http://localhost:1234/v1', model = 'local-model', apiKey = 'not-needed') {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.model = model;
        this.apiKey = apiKey;
    }
    getName() {
        return 'local';
    }
    async generateCompletion(systemMessage, userPrompt) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/chat/completions`, {
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
            const choice = response.data?.choices?.[0];
            if (!choice || !choice.message || choice.message.content === undefined) {
                throw new Error('Local LLM API returned an empty or malformed response.');
            }
            const usage = response.data?.usage;
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
            throw new Error(`Local LLM API request failed: ${message}`);
        }
    }
}
exports.LocalProvider = LocalProvider;
