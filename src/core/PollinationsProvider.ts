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
    const maxRetries = 3;
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
            timeout: 30000 // 30 second timeout
          }
        );

        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        return { content: content.trim() };
      } catch (error: any) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(`Pollinations (Free API) failed after ${maxRetries} attempts: ${error.message}`);
        }
        const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s...
        console.log(chalk.yellow(`   ! Server busy (Status ${error.response?.status || 'Error'}). Retrying in ${waitTime/1000}s... (Attempt ${attempt}/${maxRetries})`));
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    throw new Error('Unexpected error in PollinationsProvider');
  }
}
