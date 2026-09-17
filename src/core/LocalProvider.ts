import axios from 'axios';
import { ILLMProvider, LLMResponse } from './types';

/**
 * A provider for local or self-hosted LLMs that follow the OpenAI API format (e.g., LM Studio, Ollama, vLLM).
 */
export class LocalProvider implements ILLMProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor(baseUrl: string = 'http://localhost:1234/v1', model: string = 'local-model', apiKey: string = 'not-needed') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.model = model;
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'local';
  }

  async generateCompletion(systemMessage: string, userPrompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userPrompt },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

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
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Local LLM API request failed: ${message}`);
    }
  }
}
