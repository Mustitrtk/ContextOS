import axios from 'axios';
import chalk from 'chalk';
import { ILLMProvider, LLMResponse } from './types';

/**
 * A provider that uses Pollinations.ai text API.
 * This is completely FREE and requires NO API KEY.
 * Ideal for "out-of-the-box" experience.
 */
export class PollinationsProvider implements ILLMProvider {
  private model: string;

  constructor(model: string = 'openai') {
    this.model = model;
  }

  getName(): string {
    return 'pollinations';
  }

  async generateCompletion(systemMessage: string, userPrompt: string): Promise<LLMResponse> {
    const maxRetries = 7;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await axios.post(
          'https://text.pollinations.ai/',
          {
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userPrompt },
            ],
            model: this.model,
            seed: Math.floor(Math.random() * 1000),
            jsonMode: false
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000 // 60 second timeout
          }
        );

        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        return { content: content.trim() };
      } catch (error: any) {
        attempt++;
        const statusCode = error.response?.status;
        const isRetryableStatus = !statusCode || statusCode >= 500 || statusCode === 408 || statusCode === 429;
        if (!isRetryableStatus) {
          throw new Error(`Pollinations (Free API) failed with non-retryable status ${statusCode}: ${error.message}`);
        }
        if (attempt >= maxRetries) {
          throw new Error(`Pollinations (Free API) failed after ${maxRetries} attempts: ${error.message}`);
        }
        const backoffBaseMs = 2000 * Math.pow(2, attempt - 1);
        const waitTime = Math.min(backoffBaseMs + Math.floor(Math.random() * 750), 20000);
        console.log(chalk.yellow(`   ! Server busy (Status ${statusCode || 'Error'}). Retrying in ${(waitTime / 1000).toFixed(1)}s... (Attempt ${attempt}/${maxRetries})`));
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    throw new Error('Unexpected error in PollinationsProvider');
  }
}
