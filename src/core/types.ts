export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ILLMProvider {
  /**
   * Generates a completion based on a system message and a user prompt.
   */
  generateCompletion(systemMessage: string, userPrompt: string): Promise<LLMResponse>;

  /**
   * Optional: Returns the provider's name (e.g., 'openai', 'local')
   */
  getName(): string;
}
