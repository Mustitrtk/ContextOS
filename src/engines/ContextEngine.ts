import { ILLMProvider } from '../core/types';
import { FileSystemManager } from '../core/FileSystemManager';
import { CodebaseScanner } from '../utils/CodebaseScanner';
import { SpinnerUtils } from '../utils/SpinnerUtils';
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
   * @param dryRun If true, previews output without writing to disk.
   */
  async generateContext(description: string, dryRun: boolean = false): Promise<void> {
    const fileTypes = ['architecture.md', 'stack.md', 'rules.md', 'features.md'];
    const normalizedDescription = description.trim();

    if (!normalizedDescription) {
      throw new Error('Project description cannot be empty.');
    }

    if (dryRun) {
      console.log(chalk.yellow('\n--- [DRY-RUN MODE] Previewing Context Generation ---'));
    } else {
      console.log(chalk.blue('Generating context files...'));
    }

    for (const fileName of fileTypes) {
      SpinnerUtils.start(`Generating ${fileName}...`);

      const systemPrompt = this.getSystemPromptForFile(fileName);
      const userPrompt = `Project Description:\n\n${normalizedDescription}`;
      this.logTokenEstimate(`${fileName} prompt`, `${systemPrompt}\n${userPrompt}`);

      try {
        const response = await this.llm.generateCompletion(systemPrompt, userPrompt);
        this.logTokenEstimate(`${fileName} response`, response.content);

        const cleaned = this.cleanMarkdownOutput(response.content);
        const finalContent = this.validateContextMarkdown(fileName, cleaned, normalizedDescription)
          ? cleaned
          : this.getFallbackContentForFile(fileName, normalizedDescription);

        if (dryRun) {
          SpinnerUtils.succeed(`${fileName} generated (Preview only)`);
          console.log(chalk.cyan(`\n=== PREVIEW: .ai/context/${fileName} ===`));
          console.log(finalContent);
          console.log(chalk.cyan('========================================\n'));
        } else {
          await this.fsm.writeContextFile(fileName, finalContent);
          SpinnerUtils.succeed(`${fileName} saved to .ai/context/`);
        }
      } catch (error: any) {
        SpinnerUtils.fail(`Error generating ${fileName}: ${error.message}`);
        const fallbackContent = this.getFallbackContentForFile(fileName, normalizedDescription);

        if (dryRun) {
          console.log(chalk.cyan(`\n=== PREVIEW FALLBACK: .ai/context/${fileName} ===`));
          console.log(fallbackContent);
          console.log(chalk.cyan('=================================================\n'));
        } else {
          await this.fsm.writeContextFile(fileName, fallbackContent);
          console.log(chalk.yellow(`   [WARN] ${fileName} saved with fallback template.`));
        }
      }
    }

    if (dryRun) {
      console.log(chalk.yellow('\n[DRY-RUN COMPLETE] No files were modified on disk.'));
    } else {
      console.log(chalk.blue('\nContext generation complete!'));
    }
  }

  /**
   * Generates context by reading all .md files in a directory.
   */
  async generateFromFolder(dirPath: string, dryRun: boolean = false): Promise<void> {
    console.log(chalk.blue(`Reading all .md files in ${dirPath}...`));
    try {
      const allFiles = await this.walkDirectory(dirPath);
      const chunks: string[] = [];
      const dedupe = new Set<string>();

      for (const filePath of allFiles) {
        if (!filePath.endsWith('.md')) {
          continue;
        }

        if (await this.fsm.isGitIgnored(filePath)) {
          continue;
        }

        const content = (await fs.readFile(filePath, 'utf8')).trim();
        if (!content || dedupe.has(content)) {
          continue;
        }

        dedupe.add(content);
        const relativeFile = path.relative(dirPath, filePath).split(path.sep).join('/');
        chunks.push(`--- FILE: ${relativeFile} ---\n${content}`);
      }

      if (chunks.length === 0) {
        throw new Error(`No valid markdown files found in ${dirPath}`);
      }

      await this.generateContext(chunks.join('\n\n'), dryRun);
    } catch (error: any) {
      console.error(chalk.red(`Error reading folder: ${error.message}`));
    }
  }

  /**
   * Generates context by scanning an existing codebase (structure, config files, source samples).
   */
  async generateFromCodebase(dirPath: string, dryRun: boolean = false): Promise<void> {
    SpinnerUtils.start(`Scanning codebase at ${dirPath}...`);
    try {
      const scanner = new CodebaseScanner(this.fsm);
      const overview = await scanner.scanCodebase(dirPath);
      SpinnerUtils.succeed(`Codebase scan complete.`);
      await this.generateContext(`PROJECT CODEBASE ANALYSIS:\n\n${overview}`, dryRun);
    } catch (error: any) {
      SpinnerUtils.fail(`Error scanning codebase: ${error.message}`);
    }
  }

  /**
   * Synchronizes context files based on recent memory entries.
   * This ensures that decisions recorded in memory are reflected in architecture, stack, etc.
   */
  async syncFromMemory(): Promise<void> {
    console.log(chalk.blue('Synchronizing context with project memory...'));
    try {
      const decisions = await this.fsm.readMemory('decisions');
      const learnings = await this.fsm.readMemory('learnings');
      const contextFiles = await this.fsm.readContext();

      if (!decisions && !learnings) {
        console.log(chalk.yellow('No memory found to synchronize.'));
        return;
      }

      for (const [fileName, content] of Object.entries(contextFiles)) {
        console.log(chalk.gray(` - Checking if ${fileName} needs updates...`));
        
        const systemPrompt = `You are a synchronization agent. Your goal is to update ${fileName} based on new project decisions and learnings.
Maintain the original structure but incorporate new facts. Return the full updated markdown.
Rules: Raw markdown only, no JSON, no reasoning metadata.`;

        const userPrompt = `
Existing ${fileName}:
${content}

Project Memory (Decisions & Learnings):
${decisions}
${learnings}

If there are contradictions or new details in memory that affect ${fileName}, update the content. If no changes are needed, return the original content exactly.`;

        const response = await this.llm.generateCompletion(systemPrompt, userPrompt);
        const updated = this.cleanMarkdownOutput(response.content);

        if (updated && updated !== content && this.validateContextMarkdown(fileName, updated, 'sync')) {
          await this.fsm.writeContextFile(fileName, updated);
          console.log(chalk.green(`   [OK] ${fileName} synchronized.`));
        } else {
          console.log(chalk.gray(`   [SKIP] No changes needed for ${fileName}.`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Context synchronization failed:'), error.message);
    }
  }

  private async walkDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (await this.fsm.isGitIgnored(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...(await this.walkDirectory(fullPath)));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private getSystemPromptForFile(fileName: string): string {
    const common = [
      'You are a senior software architect.',
      `Generate only raw markdown for ${fileName}.`,
      'Do not return JSON.',
      'Do not include code fences.',
      'Do not include reasoning metadata.',
      'Ensure output is specific and actionable.'
    ].join(' ');

    switch (fileName) {
      case 'architecture.md':
        return `${common} Define clean architecture layers, responsibilities, and data flow.`;
      case 'stack.md':
        return `${common} Define backend, database, and AI integration stack with consistency notes.`;
      case 'rules.md':
        return `${common} Define coding standards and AI execution constraints clearly.`;
      case 'features.md':
        return `${common} Define concrete and testable features grouped by phases.`;
      default:
        return `${common} Be structured with clear headings and bullet lists.`;
    }
  }

  private cleanMarkdownOutput(output: string): string {
    const trimmed = output.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.startsWith('```')) {
      const firstLineEnd = trimmed.indexOf('\n');
      if (firstLineEnd !== -1) {
        const firstLine = trimmed.slice(0, firstLineEnd).trim();
        if (/^```(?:markdown|md)?$/i.test(firstLine)) {
          if (trimmed.endsWith('```')) {
            return trimmed.slice(firstLineEnd + 1, trimmed.length - 3).trim();
          } else {
            return trimmed.slice(firstLineEnd + 1).trim();
          }
        }
      }
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return '';
    }

    return trimmed;
  }

  private validateContextMarkdown(fileName: string, content: string, description: string): boolean {
    if (!content || content.length < 40) {
      return false;
    }

    if (!content.includes('#')) {
      return false;
    }

    const lowered = content.toLowerCase();
    switch (fileName) {
      case 'architecture.md':
        return lowered.includes('layer') || lowered.includes('component') || lowered.includes('data flow');
      case 'stack.md':
        return lowered.includes('node') || lowered.includes('typescript') || lowered.includes('database');
      case 'rules.md':
        return lowered.includes('rule') || lowered.includes('standard') || lowered.includes('constraint');
      case 'features.md':
        return lowered.includes('feature') || lowered.includes('phase') || lowered.includes('mvp');
      default:
        return lowered.includes(description.slice(0, 20).toLowerCase()) || content.length > 80;
    }
  }

  private getFallbackContentForFile(fileName: string, description: string): string {
    const shortDescription = description.trim().slice(0, 400) || 'No project description provided.';

    switch (fileName) {
      case 'architecture.md':
        return [
          '# Project Architecture (Fallback)',
          '',
          '## Overview',
          shortDescription,
          '',
          '## Clean Layers',
          '- Presentation/CLI layer',
          '- Application/Engine layer',
          '- Infrastructure/Provider and file system layer',
          '',
          '## Data Flow',
          '1. Input is collected from CLI.',
          '2. Context files are generated in `.ai/context/`.',
          '3. Tasks are generated in `.ai/tasks/tasks.md`.',
          '',
          '## Notes',
          'This fallback file was generated because the LLM output failed or was invalid.'
        ].join('\n');
      case 'stack.md':
        return [
          '# Project Stack (Fallback)',
          '',
          '## Backend',
          '- Node.js runtime',
          '- TypeScript',
          '',
          '## Database',
          '- Select based on use case (e.g. PostgreSQL for relational data)',
          '',
          '## AI Integration',
          '- Provider abstraction via LLMFactory',
          '- Support for free/pro/local model routing',
          '',
          '## Notes',
          'This fallback file was generated because the LLM output failed or was invalid.'
        ].join('\n');
      case 'rules.md':
        return [
          '# Project Rules (Fallback)',
          '',
          '## Context Is King',
          '- Derive tasks only from `.ai/context/` files.',
          '- Keep documentation synchronized with code changes.',
          '',
          '## Memory First',
          '- Review `.ai/memory/decisions.md` and `.ai/memory/learnings.md` before major changes.',
          '',
          '## Coding Standards',
          '- Keep modules small and focused.',
          '- Use explicit error handling.',
          '- Prefer async/await for I/O.',
          '',
          '## AI Execution Constraints',
          '- Return raw markdown only.',
          '- Do not produce JSON wrappers or reasoning metadata.',
          '',
          '## Project Input',
          shortDescription
        ].join('\n');
      case 'features.md':
        return [
          '# Project Features (Fallback)',
          '',
          '## Phase 1',
          '- Initialize project context',
          '- Generate architecture, stack, rules, and features docs',
          '',
          '## Phase 2',
          '- Generate actionable tasks from context',
          '- Track decisions and learnings in memory files',
          '',
          '## Edge Cases',
          '- Empty input handling',
          '- Duplicate content handling',
          '- Invalid input validation',
          '',
          '## Project Input',
          shortDescription
        ].join('\n');
      default:
        return [
          `# ${fileName} (Fallback)`,
          '',
          shortDescription,
          '',
          'This fallback file was generated because the LLM output failed or was invalid.'
        ].join('\n');
    }
  }

  private logTokenEstimate(label: string, value: string): void {
    const approxTokens = Math.ceil((value || '').length / 4);
    console.log(chalk.gray(` - ${label} estimated tokens: ~${approxTokens}`));
  }
}
