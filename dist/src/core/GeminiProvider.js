"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class GeminiProvider {
    constructor(apiKey, model = 'gemini-1.5-pro') {
        this.apiKey = apiKey;
        this.model = model;
        if (!this.apiKey) {
            throw new Error('Gemini API key is missing.');
        }
    }
    getName() {
        return 'gemini';
    }
    async generateCompletion(systemMessage, userPrompt) {
        try {
            // Gemini uses a different structure: system instructions are often passed separately or as part of the prompt
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
            const response = await axios_1.default.post(url, {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `System Instruction: ${systemMessage}\n\nUser Prompt: ${userPrompt}` }]
                    }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const content = response.data.candidates[0].content.parts[0].text;
            // Gemini API doesn't always provide usage in the same way, but it's often in usageMetadata
            const usageMetadata = response.data.usageMetadata;
            return {
                content: content.trim(),
                usage: usageMetadata ? {
                    promptTokens: usageMetadata.promptTokenCount,
                    completionTokens: usageMetadata.candidatesTokenCount,
                    totalTokens: usageMetadata.totalTokenCount,
                } : undefined,
            };
        }
        catch (error) {
            const message = error.response?.data?.error?.message || error.message;
            throw new Error(`Gemini API request failed: ${message}`);
        }
    }
}
exports.GeminiProvider = GeminiProvider;
