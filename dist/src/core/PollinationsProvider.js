"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollinationsProvider = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * A provider that uses Pollinations.ai text API.
 * This is completely FREE and requires NO API KEY.
 * Ideal for "out-of-the-box" experience.
 */
class PollinationsProvider {
    constructor(model = 'openai') {
        this.model = model;
    }
    getName() {
        return 'pollinations';
    }
    async generateCompletion(systemMessage, userPrompt) {
        try {
            const response = await axios_1.default.post('https://text.pollinations.ai/', {
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userPrompt },
                ],
                model: this.model,
                seed: Math.floor(Math.random() * 1000), // Randomize for variety
                jsonMode: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            // Pollinations simple text API returns the content directly as text
            const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            return {
                content: content.trim(),
            };
        }
        catch (error) {
            throw new Error(`Pollinations (Free API) failed: ${error.message}`);
        }
    }
}
exports.PollinationsProvider = PollinationsProvider;
