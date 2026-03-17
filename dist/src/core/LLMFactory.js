"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMFactory = void 0;
const OpenAIProvider_1 = require("./OpenAIProvider");
const AnthropicProvider_1 = require("./AnthropicProvider");
const LocalProvider_1 = require("./LocalProvider");
const GeminiProvider_1 = require("./GeminiProvider");
const PollinationsProvider_1 = require("./PollinationsProvider");
class LLMFactory {
    static create(providerName, config) {
        switch (providerName.toLowerCase()) {
            case 'openai':
                return new OpenAIProvider_1.OpenAIProvider(config.apiKey, config.model || 'gpt-4');
            case 'anthropic':
                return new AnthropicProvider_1.AnthropicProvider(config.apiKey, config.model || 'claude-3-opus-20240229');
            case 'local':
                return new LocalProvider_1.LocalProvider(config.baseUrl, config.model, config.apiKey);
            case 'gemini':
                return new GeminiProvider_1.GeminiProvider(config.apiKey, config.model || 'gemini-1.5-pro');
            case 'pollinations':
                return new PollinationsProvider_1.PollinationsProvider(config.model || 'openai');
            default:
                throw new Error(`Unsupported LLM provider: ${providerName}`);
        }
    }
}
exports.LLMFactory = LLMFactory;
