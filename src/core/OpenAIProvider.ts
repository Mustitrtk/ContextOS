import axios from 'axios';
import { ILLMProvider, LLMResponse } from './types';

export class OpenAIProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
    this.apiKey = apiKey;
    this.model = model;
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing.');
    }
  }

  getName(): string {
    return 'openai';
  }

  async generateCompletion(systemMessage: string, userPrompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
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
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`OpenAI API request failed: ${message}`);
    }
  }
}
