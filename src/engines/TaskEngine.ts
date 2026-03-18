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
      const contextFiles = await this.fsm.readContext();
      if (Object.keys(contextFiles).length === 0) {
        throw new Error('No context files found in .ai/context/. Please run "init" first.');
      }

      const contextMarkdown = this.buildContextBundle(contextFiles);
      const decisions = await this.fsm.readMemory('decisions');
      const learnings = await this.fsm.readMemory('learnings');

      const memoryContext = this.buildMemoryContext(decisions, learnings);
      const systemMessage = this.getTaskSystemPrompt();
      const userPrompt = [
        'Project Context (authoritative):',
        contextMarkdown,
        '',
        'Project Memory (use when relevant):',
        memoryContext,
        '',
        'Generate tasks.md content now.'
      ].join('\n');

      this.logTokenEstimate('Task prompt', `${systemMessage}\n${userPrompt}`);

      console.log(chalk.gray(' - Analyzing context and planning tasks...'));
      const response = await this.llm.generateCompletion(systemMessage, userPrompt);
      this.logTokenEstimate('Task response', response.content);

      const cleaned = this.cleanMarkdownOutput(response.content);
      const validated = this.validateTaskMarkdown(cleaned, Object.keys(contextFiles));

      await this.fsm.writeTasks(validated);
      await this.fsm.appendMemory(
        'learnings',
        `Generated tasks.md from ${Object.keys(contextFiles).length} context files using ${this.llm.getName()}.`
      );

      console.log(chalk.green('[OK] Project tasks generated at .ai/tasks/tasks.md'));
    } catch (error: any) {
      console.error(chalk.red('Task generation failed:'), error.message);
    }
  }

  private buildContextBundle(contextFiles: Record<string, string>): string {
    const dedupe = new Set<string>();
    const chunks: string[] = [];

    for (const [fileName, content] of Object.entries(contextFiles)) {
      const normalized = content.trim();
      if (!normalized || dedupe.has(normalized)) {
        continue;
      }

      dedupe.add(normalized);
      chunks.push(`--- FILE: ${fileName} ---\n${normalized}`);
    }

    if (chunks.length === 0) {
      throw new Error('Context files are empty or duplicated. Please regenerate context with "contextos init".');
    }

    return chunks.join('\n\n');
  }

  private buildMemoryContext(decisions: string, learnings: string): string {
    if (!decisions.trim() && !learnings.trim()) {
      return 'No memory entries found.';
    }

    return [
      '--- decisions.md ---',
      decisions.trim() || '(empty)',
      '',
      '--- learnings.md ---',
      learnings.trim() || '(empty)'
    ].join('\n');
  }

  private getTaskSystemPrompt(): string {
    return [
      'You are a project manager agent.',
      'Context is King: derive tasks only from architecture.md, stack.md, rules.md, and features.md content.',
      'Memory First: use memory entries to avoid contradicting prior decisions.',
      'Output constraints:',
      '1. Return raw markdown only.',
      '2. Do not return JSON.',
      '3. Do not include code fences.',
      '4. Do not include chain-of-thought or reasoning metadata.',
      '5. Tasks must be actionable and specific.',
      '6. Use checkbox format "- [ ] ...".',
      '7. Organize by phases.',
      '8. Reference source files in each task using "(ref: <file>.md)".',
      '9. Avoid duplicate tasks.'
    ].join('\n');
  }

  private cleanMarkdownOutput(output: string): string {
    const trimmed = output.trim();
    if (!trimmed) {
      return '';
    }

    const fenced = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
    if (fenced) {
      return fenced[1].trim();
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return '';
    }

    return trimmed;
  }

  private validateTaskMarkdown(markdown: string, availableFiles: string[]): string {
    const lines = markdown
      .split(/\r?\n/)
      .map((line) => line.trimRight())
      .filter((line) => line.length > 0);

    const checkboxLines = lines.filter((line) => /^- \[ \] .+/.test(line));
    const hasPhaseHeader = lines.some((line) => /^#{1,6}\s+Phase\b/i.test(line));

    if (checkboxLines.length === 0 || !hasPhaseHeader) {
      return this.buildFallbackTasks(availableFiles);
    }

    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const line of lines) {
      if (/^- \[ \] .+/.test(line)) {
        const normalized = line.toLowerCase();
        if (seen.has(normalized)) {
          continue;
        }
        seen.add(normalized);
      }
      deduped.push(line);
    }

    return deduped.join('\n');
  }

  private buildFallbackTasks(availableFiles: string[]): string {
    const refs = availableFiles.join(', ');
    return [
      '# tasks.md (Fallback)',
      '',
      '## Phase 1: Context Validation',
      `- [ ] Validate architecture and module boundaries (ref: architecture.md)`,
      `- [ ] Verify technology stack consistency (ref: stack.md)`,
      `- [ ] Confirm coding and execution constraints (ref: rules.md)`,
      '',
      '## Phase 2: Core Delivery',
      `- [ ] Implement MVP features in smallest possible units (ref: features.md)`,
      `- [ ] Add tests for critical flows and edge cases (ref: features.md)`,
      `- [ ] Update documentation to match implementation (ref: architecture.md)`,
      '',
      `Generated because model output failed validation. Available context files: ${refs}.`
    ].join('\n');
  }

  private logTokenEstimate(label: string, value: string): void {
    const approxTokens = Math.ceil((value || '').length / 4);
    console.log(chalk.gray(` - ${label} estimated tokens: ~${approxTokens}`));
  }
}
