import { ILLMProvider, LLMResponse } from './types';
import axios from 'axios';

export class AnthropicProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-opus-20240229') {
    this.apiKey = apiKey;
    this.model = model;
    if (!this.apiKey) {
      throw new Error('Anthropic API key is missing.');
    }
  }

  getName(): string {
    return 'anthropic';
  }

  async generateCompletion(systemMessage: string, userPrompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.model,
          max_tokens: 4096,
          system: systemMessage,
          messages: [
            { role: 'user', content: userPrompt },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

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
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Anthropic API request failed: ${message}`);
    }
  }
}
