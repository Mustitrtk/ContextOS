import axios from 'axios';
import { ILLMProvider, LLMResponse } from './types';

export class GeminiProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-pro') {
    this.apiKey = apiKey;
    this.model = model;
    if (!this.apiKey) {
      throw new Error('Gemini API key is missing.');
    }
  }

  getName(): string {
    return 'gemini';
  }

  async generateCompletion(systemMessage: string, userPrompt: string): Promise<LLMResponse> {
    try {
      // Gemini uses a different structure: system instructions are often passed separately or as part of the prompt
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: `System Instruction: ${systemMessage}\n\nUser Prompt: ${userPrompt}` }]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const candidate = response.data?.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('Gemini API returned an empty response or content was blocked by safety filters.');
      }

      // Gemini API doesn't always provide usage in the same way, but it's often in usageMetadata
      const usageMetadata = response.data?.usageMetadata;

      return {
        content: content.trim(),
        usage: usageMetadata ? {
          promptTokens: usageMetadata.promptTokenCount,
          completionTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
        } : undefined,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Gemini API request failed: ${message}`);
    }
  }
}
