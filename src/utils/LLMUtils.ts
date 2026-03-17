import { ILLMProvider } from '../core/types';
import { LLMFactory } from '../core/LLMFactory';
import chalk from 'chalk';

export function getLLMProvider(requestedProvider?: string): ILLMProvider {
  let providerName = requestedProvider?.toLowerCase();
  let config: any = {};

  // 1. If user explicitly requested a provider
  if (providerName) {
    switch (providerName) {
      case 'openai':
        config = { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4' };
        break;
      case 'gemini':
        config = { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' };
        break;
      case 'anthropic':
        config = { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307' };
        break;
      case 'local':
        config = { 
          baseUrl: process.env.LOCAL_LLM_URL || 'http://localhost:1234/v1', 
          model: process.env.LOCAL_LLM_MODEL || 'local-model',
          apiKey: process.env.LOCAL_LLM_KEY || 'not-needed'
        };
        break;
      case 'pollinations':
      case 'free':
        providerName = 'pollinations';
        config = { model: process.env.FREE_LLM_MODEL || 'openai' };
        break;
      case 'pro':
        // Prefer Gemini or OpenAI for 'pro'
        if (process.env.GEMINI_API_KEY) {
          providerName = 'gemini';
          config = { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-1.5-pro' };
        } else if (process.env.OPENAI_API_KEY) {
          providerName = 'openai';
          config = { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4' };
        } else {
          console.log(chalk.red('Error: "pro" requires GEMINI_API_KEY or OPENAI_API_KEY in .env.'));
          console.log(chalk.yellow('Falling back to "free" (pollinations)...'));
          providerName = 'pollinations';
          config = { model: process.env.FREE_LLM_MODEL || 'openai' };
        }
        break;
      default:
        console.log(chalk.yellow(`Unknown provider "${providerName}". Falling back to automatic selection.`));
        providerName = undefined; // Fallback to auto
    }
    
    // Check if the requested provider has the necessary API key (if not local or pollinations)
    if (providerName && providerName !== 'pollinations' && providerName !== 'local' && !config.apiKey) {
      console.log(chalk.red(`Error: API key for "${providerName}" is missing in .env.`));
      console.log(chalk.yellow(`Falling back to automatic selection...`));
      providerName = undefined;
    }
  }

  // 2. Automatic Selection (Fallback Chain)
  if (!providerName) {
    if (process.env.GEMINI_API_KEY) {
      providerName = 'gemini';
      config = { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' };
    } else if (process.env.OPENAI_API_KEY) {
      providerName = 'openai';
      config = { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4' };
    } else if (process.env.ANTHROPIC_API_KEY) {
      providerName = 'anthropic';
      config = { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307' };
    } else {
      // Final Fallback
      providerName = 'pollinations';
      config = { model: process.env.FREE_LLM_MODEL || 'openai' };
      console.log(chalk.blue('Using FREE "Pollinations" LLM (No Key Required).'));
    }
  }

  console.log(chalk.gray(`LLM Provider: ${chalk.white(providerName)}`));
  return LLMFactory.create(providerName!, config);
}
