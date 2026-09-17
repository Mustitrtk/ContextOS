"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskEngine = void 0;
const chalk_1 = __importDefault(require("chalk"));
const ACTION_VERBS = [
    // English
    'add',
    'analyze',
    'audit',
    'build',
    'check',
    'confirm',
    'configure',
    'connect',
    'create',
    'define',
    'deploy',
    'design',
    'develop',
    'document',
    'enforce',
    'ensure',
    'establish',
    'extend',
    'extract',
    'fix',
    'generate',
    'handle',
    'implement',
    'improve',
    'initialize',
    'integrate',
    'migrate',
    'monitor',
    'optimize',
    'parse',
    'provide',
    'refactor',
    'remove',
    'replace',
    'research',
    'resolve',
    'restructure',
    'review',
    'run',
    'scan',
    'schedule',
    'secure',
    'set',
    'setup',
    'simplify',
    'standardize',
    'support',
    'sync',
    'test',
    'track',
    'update',
    'upgrade',
    'validate',
    'verify',
    'write',
    // Turkish (Türkçe)
    'ekle',
    'analiz',
    'denetle',
    'derle',
    'doğrula',
    'düzelt',
    'düzenle',
    'entegre',
    'geliştir',
    'güncelle',
    'incele',
    'kontrol',
    'kur',
    'oluştur',
    'optimize',
    'refactor',
    'sağla',
    'tanımla',
    'tara',
    'taşı',
    'test',
    'uygula',
    'yapılandır',
    'yaz',
    'yönet'
];
const VAGUE_PATTERNS = [
    /\bdo everything\b/i,
    /\bmisc\b/i,
    /\bstuff\b/i,
    /\bvarious\b/i,
    /\betc\.?\b/i,
    /\bsomething\b/i,
    /\bimprove project\b/i,
    /\bhandle project\b/i,
    /\bwork on\b/i,
    /^(review|improve|fix|handle|update)\s+(project|system|app|code|documentation)$/i
];
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
                'Project Context (authoritative source of truth):',
                contextMarkdown,
                '',
                'Project Memory (secondary source for prior decisions and learnings):',
                memoryContext,
                '',
                'Generate tasks.md content now.'
            ].join('\n');
            this.logTokenEstimate('Task prompt', `${systemMessage}\n${userPrompt}`);
            console.log(chalk_1.default.gray(' - Analyzing context and planning tasks...'));
            const response = await this.llm.generateCompletion(systemMessage, userPrompt);
            this.logTokenEstimate('Task response', response.content);
            let cleaned = this.cleanMarkdownOutput(response.content);
            const originalCleaned = cleaned;
            if (contextFiles['rules.md']) {
                console.log(chalk_1.default.gray(' - Validating tasks against project rules...'));
                cleaned = await this.validateTasksAgainstRules(cleaned, contextFiles['rules.md']);
            }
            const validated = this.validateTaskMarkdown(cleaned, contextFiles, originalCleaned);
            await this.fsm.writeTasks(validated);
            await this.fsm.appendMemory('learnings', `Generated tasks.md from ${Object.keys(contextFiles).length} context files using ${this.llm.getName()}.`);
            console.log(chalk_1.default.green('[OK] Project tasks generated at .ai/tasks/tasks.md'));
        }
        catch (error) {
            console.error(chalk_1.default.red('Task generation failed:'), error.message);
            throw error;
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
        const contextFiles = await this.fsm.readContext();
        if (Object.keys(contextFiles).length === 0) {
            throw new Error('No context files found in .ai/context/. Please run "init" first.');
        }
        const lines = tasksMarkdown.split(/\r?\n/);
        const taskIndex = lines.findIndex((line) => line.trim().startsWith('- [ ]'));
        if (taskIndex === -1) {
            console.log(chalk_1.default.green('All tasks are completed! [x]'));
            return;
        }
        const taskLine = lines[taskIndex].trim();
        const taskDescription = taskLine.replace('- [ ]', '').trim();
        const referencedFiles = this.extractReferenceFiles(taskDescription, Object.keys(contextFiles));
        const relevantContext = this.buildExecutionContext(contextFiles, taskDescription, referencedFiles);
        const decisions = await this.fsm.readMemory('decisions');
        const learnings = await this.fsm.readMemory('learnings');
        const relevantMemory = this.buildRelevantMemoryContext(taskDescription, referencedFiles, decisions, learnings);
        console.log(chalk_1.default.blue(`\n--- Next Task: ${taskDescription} ---`));
        console.log(chalk_1.default.gray(` - Context refs: ${referencedFiles.join(', ') || 'inferred from available context'}`));
        console.log(chalk_1.default.gray(' - Querying memory before execution...'));
        const systemPrompt = [
            'You are an execution agent.',
            'Context is King: do not invent scope beyond the provided context excerpts.',
            'Memory First: honor relevant prior decisions and learnings before proposing work.',
            'Return raw markdown only, with no JSON or reasoning metadata.'
        ].join('\n');
        const userPrompt = [
            `Task: ${taskDescription}`,
            '',
            'Relevant Context:',
            relevantContext,
            '',
            'Relevant Memory:',
            relevantMemory,
            '',
            'Describe how to execute this task.',
            'If this is a code task, provide the concrete file path(s) and the intended file content or edit summary.',
            'If this is a conceptual task, provide the final decision and why it follows the referenced context.'
        ].join('\n');
        const response = await this.llm.generateCompletion(systemPrompt, userPrompt);
        console.log(chalk_1.default.cyan('\nExecution Proposal:'));
        console.log(response.content);
        console.log(chalk_1.default.gray('\n - Executing task and updating memory...'));
        lines[taskIndex] = taskLine.replace('[ ]', '[x]');
        await this.fsm.writeTasks(lines.join('\n'));
        await this.fsm.appendMemory('learnings', [
            `Completed task: ${taskDescription}`,
            `Relevant refs: ${referencedFiles.join(', ') || 'inferred'}`,
            `Result: ${response.content.slice(0, 200)}...`
        ].join('\n'));
        console.log(chalk_1.default.green(`\n[OK] Task marked as completed. Use "npx contextos run" for the next task.`));
    }
    async validateTasksAgainstRules(tasksMarkdown, rulesMarkdown) {
        const systemPrompt = `You are a quality assurance agent. Your goal is to ensure project tasks comply with the project rules.
Rules: Raw markdown only, no JSON, no reasoning metadata. Use checkbox format. Preserve phase headings.`;
        const userPrompt = `
Proposed Tasks:
${tasksMarkdown}

Project Rules:
${rulesMarkdown}

If any task violates a rule, rewrite or remove it.
Ensure all tasks are actionable, specific, and mapped to the relevant context file using "(ref: <file>.md)".
Return the final markdown list.`;
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
        for (const fileName of this.getPreferredContextOrder(Object.keys(contextFiles))) {
            const content = contextFiles[fileName];
            if (!content) {
                continue;
            }
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
    buildRelevantMemoryContext(taskDescription, referencedFiles, decisions, learnings) {
        return [
            '--- decisions.md ---',
            this.extractRelevantMemory(decisions, taskDescription, referencedFiles),
            '',
            '--- learnings.md ---',
            this.extractRelevantMemory(learnings, taskDescription, referencedFiles)
        ].join('\n');
    }
    buildExecutionContext(contextFiles, taskDescription, referencedFiles) {
        const filesToUse = referencedFiles.length > 0
            ? referencedFiles
            : this.inferReferenceFiles(taskDescription, contextFiles, Object.keys(contextFiles));
        return filesToUse
            .map((fileName) => `--- FILE: ${fileName} ---\n${contextFiles[fileName].trim()}`)
            .join('\n\n');
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
            '5. Tasks must be clear, actionable, and small enough to execute as a single unit of work.',
            '6. Use checkbox format "- [ ] ...".',
            '7. Organize by phases.',
            '8. Reference source files in each task using "(ref: <file>.md)".',
            '9. Avoid duplicate tasks.',
            '10. Do not create tasks that cannot be traced back to the provided context.'
        ].join('\n');
    }
    cleanMarkdownOutput(output) {
        const trimmed = output.trim();
        if (!trimmed) {
            return '';
        }
        // Handle properly closed code fences
        const fenced = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
        if (fenced) {
            return fenced[1].trim();
        }
        // Handle unclosed code fences (LLM sometimes forgets closing ```)
        const unclosedFence = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]+)$/i);
        if (unclosedFence) {
            // Strip the opening fence and return the rest
            return unclosedFence[1].replace(/```\s*$/, '').trim();
        }
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return '';
        }
        return trimmed;
    }
    validateTaskMarkdown(markdown, contextFiles, originalMarkdown) {
        const availableFiles = Object.keys(contextFiles);
        const lines = markdown
            .split(/\r?\n/)
            .map((line) => line.trimRight())
            .filter((line) => line.trim().length > 0);
        const normalized = this.normalizeTaskLines(lines, contextFiles);
        const checkboxLines = normalized.filter((line) => /^- \[ \] .+/.test(line));
        const hasPhaseHeader = normalized.some((line) => /^#{1,6}\s+Phase\b/i.test(line));
        if (checkboxLines.length === 0 || !hasPhaseHeader) {
            // Bug Fix: Try original (pre-rule-validation) tasks before falling back to generic template
            if (originalMarkdown && originalMarkdown !== markdown) {
                console.warn(chalk_1.default.yellow('   [WARN] Rule-validated tasks lost formatting. Trying original tasks...'));
                const origLines = originalMarkdown.split(/\r?\n/).map((l) => l.trimRight()).filter((l) => l.trim().length > 0);
                const origNormalized = this.normalizeTaskLines(origLines, contextFiles);
                const origCheckboxes = origNormalized.filter((l) => /^- \[ \] .+/.test(l));
                if (origCheckboxes.length > 0) {
                    return origNormalized.join('\n');
                }
            }
            return this.buildFallbackTasks(availableFiles);
        }
        const seen = new Set();
        const deduped = [];
        for (const line of normalized) {
            if (/^- \[ \] .+/.test(line)) {
                const normalizedLine = line.toLowerCase();
                if (seen.has(normalizedLine)) {
                    continue;
                }
                seen.add(normalizedLine);
            }
            deduped.push(line);
        }
        const finalTasks = deduped.filter((line) => /^#{1,6}\s+Phase\b/i.test(line) || /^- \[ \] .+/.test(line));
        if (!finalTasks.some((line) => /^- \[ \] .+/.test(line))) {
            return this.buildFallbackTasks(availableFiles);
        }
        return deduped.join('\n');
    }
    normalizeTaskLines(lines, contextFiles) {
        const availableFiles = Object.keys(contextFiles);
        const normalized = [];
        let lastPhaseHeader = '';
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (/^#{1,6}\s+Phase\b/i.test(line)) {
                lastPhaseHeader = line;
                normalized.push(line);
                continue;
            }
            if (!/^- \[ \] .+/.test(line)) {
                continue;
            }
            const body = line.replace(/^- \[ \]\s*/, '').trim();
            const normalizedTask = this.normalizeTaskLine(body, contextFiles, availableFiles);
            if (!normalizedTask) {
                continue;
            }
            if (!lastPhaseHeader && normalized.length === 0) {
                lastPhaseHeader = '## Phase 1: Generated Tasks';
                normalized.push(lastPhaseHeader);
            }
            normalized.push(`- [ ] ${normalizedTask}`);
        }
        return normalized;
    }
    normalizeTaskLine(body, contextFiles, availableFiles) {
        const collapsed = body.replace(/\s+/g, ' ').trim();
        const description = collapsed.replace(/\s*\(ref:\s*[^)]+\)\s*$/i, '').trim();
        if (!this.isActionableTask(description)) {
            return null;
        }
        const refs = this.extractReferenceFiles(collapsed, availableFiles);
        const finalRefs = refs.length > 0 ? refs : this.inferReferenceFiles(description, contextFiles, availableFiles);
        if (finalRefs.length === 0) {
            return null;
        }
        return `${this.capitalizeSentence(description)} (ref: ${finalRefs.join(', ')})`;
    }
    isActionableTask(description) {
        if (description.length < 8 || description.length > 500) {
            return false;
        }
        const words = description.trim().split(/\s+/);
        if (words.length < 3) {
            return false;
        }
        if (VAGUE_PATTERNS.some((pattern) => pattern.test(description))) {
            return false;
        }
        const normalized = description.toLowerCase();
        const normalizedWords = normalized.split(/\s+/);
        const hasVerb = ACTION_VERBS.some((verb) => normalized.startsWith(`${verb} `) || normalizedWords.slice(0, 3).includes(verb));
        if (!hasVerb) {
            return false;
        }
        return true;
    }
    extractReferenceFiles(taskBody, availableFiles) {
        const refs = new Set();
        const matches = taskBody.match(/\(ref:\s*([^)]+)\)/gi) || [];
        for (const match of matches) {
            const inner = match.replace(/\(ref:\s*/i, '').replace(/\)$/i, '');
            for (const part of inner.split(',')) {
                const fileName = part.trim();
                if (availableFiles.includes(fileName)) {
                    refs.add(fileName);
                }
            }
        }
        return Array.from(refs);
    }
    inferReferenceFiles(taskDescription, contextFiles, availableFiles) {
        const description = taskDescription.toLowerCase();
        const scored = availableFiles
            .map((fileName) => {
            const fileScore = this.scoreTaskAgainstFile(description, fileName, contextFiles[fileName]);
            return { fileName, score: fileScore };
        })
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score);
        if (scored.length > 0) {
            return scored.slice(0, 2).map((entry) => entry.fileName);
        }
        return this.getPreferredContextOrder(availableFiles).slice(0, Math.min(2, availableFiles.length));
    }
    scoreTaskAgainstFile(taskDescription, fileName, content) {
        let score = 0;
        const loweredContent = content.toLowerCase();
        const fileKeywords = {
            'architecture.md': ['architecture', 'layer', 'module', 'boundary', 'flow', 'component'],
            'stack.md': ['stack', 'dependency', 'provider', 'runtime', 'database', 'model'],
            'rules.md': ['rule', 'constraint', 'standard', 'validation', 'format'],
            'features.md': ['feature', 'phase', 'mvp', 'task', 'deliverable']
        };
        for (const keyword of fileKeywords[fileName] || []) {
            if (taskDescription.includes(keyword)) {
                score += 3;
            }
            if (loweredContent.includes(keyword) && taskDescription.includes(keyword)) {
                score += 2;
            }
        }
        const plainFileName = fileName.replace('.md', '');
        if (taskDescription.includes(plainFileName)) {
            score += 4;
        }
        return score;
    }
    extractRelevantMemory(memoryMarkdown, taskDescription, referencedFiles) {
        const trimmed = memoryMarkdown.trim();
        if (!trimmed) {
            return 'No relevant entries found.';
        }
        const entries = trimmed
            .split(/\n(?=## )/)
            .map((entry) => entry.trim())
            .filter(Boolean);
        const taskTokens = new Set(taskDescription
            .toLowerCase()
            .replace(/[^a-z0-9.\s]/g, ' ')
            .split(/\s+/)
            .filter((token) => token.length > 2));
        for (const ref of referencedFiles) {
            taskTokens.add(ref.toLowerCase());
            taskTokens.add(ref.replace('.md', '').toLowerCase());
        }
        const scored = entries
            .map((entry) => ({
            entry,
            score: this.scoreMemoryEntry(entry.toLowerCase(), taskTokens)
        }))
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map((entry) => entry.entry);
        return scored.length > 0 ? scored.join('\n\n') : 'No relevant entries found.';
    }
    scoreMemoryEntry(entry, taskTokens) {
        let score = 0;
        for (const token of taskTokens) {
            if (entry.includes(token)) {
                score += token.endsWith('.md') ? 3 : 1;
            }
        }
        return score;
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
            `- [ ] Update documentation to match implementation (ref: architecture.md, rules.md)`,
            '',
            `Generated because model output failed validation. Available context files: ${refs}.`
        ].join('\n');
    }
    getPreferredContextOrder(availableFiles) {
        const preferred = ['architecture.md', 'stack.md', 'rules.md', 'features.md'];
        const ordered = preferred.filter((fileName) => availableFiles.includes(fileName));
        const rest = availableFiles.filter((fileName) => !preferred.includes(fileName)).sort();
        return [...ordered, ...rest];
    }
    capitalizeSentence(value) {
        if (!value) {
            return value;
        }
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
    logTokenEstimate(label, value) {
        const approxTokens = Math.ceil((value || '').length / 4);
        console.log(chalk_1.default.gray(` - ${label} estimated tokens: ~${approxTokens}`));
    }
}
exports.TaskEngine = TaskEngine;
