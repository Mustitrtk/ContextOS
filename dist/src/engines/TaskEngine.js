"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskEngine = void 0;
const chalk_1 = __importDefault(require("chalk"));
class TaskEngine {
    constructor(llm, fsm) {
        this.llm = llm;
        this.fsm = fsm;
    }
    /**
     * Reads all context from .ai/context/ and generates an initial project task list.
     */
    async generateInitialTasks() {
        console.log(chalk_1.default.blue('Generating project tasks based on context...'));
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
            console.log(chalk_1.default.gray(' - Analyzing context and planning tasks...'));
            const response = await this.llm.generateCompletion(systemMessage, userPrompt);
            this.logTokenEstimate('Task response', response.content);
            let cleaned = this.cleanMarkdownOutput(response.content);
            // Point (C): Task Validation against rules.md
            if (contextFiles['rules.md']) {
                console.log(chalk_1.default.gray(' - Validating tasks against project rules...'));
                cleaned = await this.validateTasksAgainstRules(cleaned, contextFiles['rules.md']);
            }
            const validated = this.validateTaskMarkdown(cleaned, Object.keys(contextFiles));
            await this.fsm.writeTasks(validated);
            await this.fsm.appendMemory('learnings', `Generated tasks.md from ${Object.keys(contextFiles).length} context files using ${this.llm.getName()}.`);
            console.log(chalk_1.default.green('[OK] Project tasks generated at .ai/tasks/tasks.md'));
        }
        catch (error) {
            console.error(chalk_1.default.red('Task generation failed:'), error.message);
        }
    }
    /**
     * Main execution loop: picks a task, executes it (simulated for now), and updates status.
     */
    async runAgentLoop() {
        const tasksMarkdown = await this.fsm.readTasks();
        if (!tasksMarkdown) {
            console.log(chalk_1.default.yellow('No tasks.md found. Generating initial tasks...'));
            await this.generateInitialTasks();
            return;
        }
        const lines = tasksMarkdown.split(/\r?\n/);
        const taskIndex = lines.findIndex((line) => line.trim().startsWith('- [ ]'));
        if (taskIndex === -1) {
            console.log(chalk_1.default.green('All tasks are completed! [x]'));
            return;
        }
        const taskLine = lines[taskIndex].trim();
        const taskDescription = taskLine.replace('- [ ]', '').trim();
        console.log(chalk_1.default.blue(`\n--- Next Task: ${taskDescription} ---`));
        // Point (A): Query Memory for relevant info
        const decisions = await this.fsm.readMemory('decisions');
        const systemPrompt = `You are an execution agent.
Task: ${taskDescription}
Memory context: ${decisions}
Rules: Raw markdown only, no JSON.`;
        const userPrompt = `Based on the task and memory, describe how to execute this task. 
If this is a code task, provide the file path and content. 
If this is a conceptual task, provide the final decision.`;
        console.log(chalk_1.default.gray(' - Querying memory and planning execution...'));
        const response = await this.llm.generateCompletion(systemPrompt, userPrompt);
        console.log(chalk_1.default.cyan('\nExecution Proposal:'));
        console.log(response.content);
        // Simulated "Execute" - In a real agent, this would write files
        console.log(chalk_1.default.gray('\n - Executing task and updating memory...'));
        // Mark task as done
        lines[taskIndex] = taskLine.replace('[ ]', '[x]');
        await this.fsm.writeTasks(lines.join('\n'));
        // Record Learning (Phase 2: Update Memory step)
        await this.fsm.appendMemory('learnings', `Completed task: ${taskDescription}\nResult: ${response.content.slice(0, 200)}...`);
        console.log(chalk_1.default.green(`\n[OK] Task marked as completed. Use "npx contextos run" for the next task.`));
    }
    async validateTasksAgainstRules(tasksMarkdown, rulesMarkdown) {
        const systemPrompt = `You are a quality assurance agent. Your goal is to ensure project tasks comply with the project rules.
Rules: Raw markdown only, no JSON, no reasoning metadata. Use checkbox format.`;
        const userPrompt = `
Proposed Tasks:
${tasksMarkdown}

Project Rules:
${rulesMarkdown}

If any task violates a rule, rewrite or remove it. Ensure all tasks are actionable and specific. Return the final markdown list.`;
        try {
            const response = await this.llm.generateCompletion(systemPrompt, userPrompt);
            return this.cleanMarkdownOutput(response.content) || tasksMarkdown;
        }
        catch (error) {
            console.warn(chalk_1.default.yellow('   [WARN] Task validation failed, using original tasks.'));
            return tasksMarkdown;
        }
    }
    buildContextBundle(contextFiles) {
        const dedupe = new Set();
        const chunks = [];
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
    buildMemoryContext(decisions, learnings) {
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
    getTaskSystemPrompt() {
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
    cleanMarkdownOutput(output) {
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
    validateTaskMarkdown(markdown, availableFiles) {
        const lines = markdown
            .split(/\r?\n/)
            .map((line) => line.trimRight())
            .filter((line) => line.length > 0);
        const checkboxLines = lines.filter((line) => /^- \[ \] .+/.test(line));
        const hasPhaseHeader = lines.some((line) => /^#{1,6}\s+Phase\b/i.test(line));
        if (checkboxLines.length === 0 || !hasPhaseHeader) {
            return this.buildFallbackTasks(availableFiles);
        }
        const seen = new Set();
        const deduped = [];
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
    buildFallbackTasks(availableFiles) {
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
    logTokenEstimate(label, value) {
        const approxTokens = Math.ceil((value || '').length / 4);
        console.log(chalk_1.default.gray(` - ${label} estimated tokens: ~${approxTokens}`));
    }
}
exports.TaskEngine = TaskEngine;
