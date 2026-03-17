import { ILLMProvider } from '../core/types';
import { FileSystemManager } from '../core/FileSystemManager';
import chalk from 'chalk';

export class TaskEngine {
  private llm: ILLMProvider;
  private fsm: FileSystemManager;

  constructor(llm: ILLMProvider, fsm: FileSystemManager) {
    this.llm = llm;
    this.fsm = fsm;
  }

  /**
   * Reads all context from .ai/context/ and generates an initial project task list.
   */
  async generateInitialTasks(): Promise<void> {
    console.log(chalk.blue('Generating project tasks based on context...'));

    try {
      // 1. Read all context files
      const contextFiles = await this.fsm.readContext();
      let fullContext = '';
      
      for (const [fileName, content] of Object.entries(contextFiles)) {
        fullContext += `--- FILE: ${fileName} ---\n${content}\n\n`;
      }

      if (!fullContext) {
        throw new Error('No context files found in .ai/context/. Please run "init" first.');
      }

      // 2. Prepare the prompt for LLM
      const systemMessage = `You are a project manager agent. Based on the provided project context, generate a structured list of actionable tasks in a Markdown file named tasks.md. 
      Rules for task generation:
      1. Break down tasks into the smallest possible units of work.
      2. Use simple Markdown checkbox format: - [ ] Task description.
      3. Organize tasks into logical phases (e.g., Phase 1: Setup, Phase 2: Core Features).
      4. Ensure tasks are strictly derived from the context (architecture, stack, rules, features).
      5. Output ONLY the markdown content for tasks.md.`;

      const userPrompt = `Project Context:\n\n${fullContext}\n\nPlease generate the tasks.md content.`;

      // 3. Call LLM
      console.log(chalk.gray(' - Analyzing context and planning tasks...'));
      const response = await this.llm.generateCompletion(systemMessage, userPrompt);

      // 4. Save to .ai/tasks/tasks.md
      await this.fsm.writeTasks(response.content);
      console.log(chalk.green('✓ Project tasks generated successfully at .ai/tasks/tasks.md'));

    } catch (error: any) {
      console.error(chalk.red('Task generation failed:'), error.message);
    }
  }
}
