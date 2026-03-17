import { ILLMProvider } from '../core/types';
import { FileSystemManager } from '../core/FileSystemManager';
import * as fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class ContextEngine {
  private llm: ILLMProvider;
  private fsm: FileSystemManager;

  constructor(llm: ILLMProvider, fsm: FileSystemManager) {
    this.llm = llm;
    this.fsm = fsm;
  }

  /**
   * Generates the project's foundation context files.
   * @param description A project description (text or markdown file content).
   */
  async generateContext(description: string): Promise<void> {
    const fileTypes = ['architecture.md', 'stack.md', 'rules.md', 'features.md'];
    
    console.log(chalk.blue('Generating context files...'));

    for (const fileName of fileTypes) {
      console.log(chalk.gray(` - Generating ${fileName}...`));
      
      const systemPrompt = this.getSystemPromptForFile(fileName);
      const userPrompt = `Project Description:\n\n${description}`;

      try {
        const response = await this.llm.generateCompletion(systemPrompt, userPrompt);
        await this.fsm.writeContextFile(fileName, response.content);
        console.log(chalk.green(`   ✓ ${fileName} saved.`));
      } catch (error: any) {
        console.error(chalk.red(`   ✗ Error generating ${fileName}:`), error.message);
      }
    }

    console.log(chalk.blue('\nContext generation complete!'));
  }

  /**
   * Generates context by reading all .md files in a directory.
   */
  async generateFromFolder(dirPath: string): Promise<void> {
    console.log(chalk.blue(`Reading all .md files in ${dirPath}...`));
    try {
      const files = await fs.readdir(dirPath);
      let combinedContent = '';

      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(dirPath, file), 'utf8');
          combinedContent += `--- FILE: ${file} ---\n${content}\n\n`;
        }
      }

      if (!combinedContent) {
        throw new Error(`No markdown files found in ${dirPath}`);
      }

      await this.generateContext(combinedContent);
    } catch (error: any) {
      console.error(chalk.red(`Error reading folder: ${error.message}`));
    }
  }

  private getSystemPromptForFile(fileName: string): string {
    const basePrompt = "You are a senior software architect. Based on the following project description, generate a detailed markdown file named ";
    
    switch (fileName) {
      case 'architecture.md':
        return `${basePrompt} architecture.md. Focus on high-level system components, data flow, and architectural patterns. Use structured headers and lists.`;
      case 'stack.md':
        return `${basePrompt} stack.md. Define the core technologies, languages, frameworks, and tools to be used. Justify the choices if necessary.`;
      case 'rules.md':
        return `${basePrompt} rules.md. Establish operational rules for the project, including coding standards, file structures, and agent behavior constraints.`;
      case 'features.md':
        return `${basePrompt} features.md. List and describe the key features and functionalities of the project, potentially broken down into phases.`;
      default:
        return `${basePrompt} ${fileName}. Be as detailed and structured as possible.`;
    }
  }
}
