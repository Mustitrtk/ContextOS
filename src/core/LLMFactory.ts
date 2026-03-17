import { ILLMProvider } from './types';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { LocalProvider } from './LocalProvider';
import { GeminiProvider } from './GeminiProvider';
import { PollinationsProvider } from './PollinationsProvider';

export class LLMFactory {
  static create(providerName: string, config: any): ILLMProvider {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(config.apiKey, config.model || 'gpt-4');
      case 'anthropic':
        return new AnthropicProvider(config.apiKey, config.model || 'claude-3-opus-20240229');
      case 'local':
        return new LocalProvider(config.baseUrl, config.model, config.apiKey);
      case 'gemini':
        return new GeminiProvider(config.apiKey, config.model || 'gemini-1.5-pro');
      case 'pollinations':
        return new PollinationsProvider(config.model || 'openai');
      default:
        throw new Error(`Unsupported LLM provider: ${providerName}`);
    }
  }
}
