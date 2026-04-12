"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextEngine = void 0;
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
class ContextEngine {
    constructor(llm, fsm) {
        this.llm = llm;
        this.fsm = fsm;
    }
    /**
     * Generates the project's foundation context files.
     * @param description A project description (text or markdown file content).
     */
    async generateContext(description) {
        const fileTypes = ['architecture.md', 'stack.md', 'rules.md', 'features.md'];
        const normalizedDescription = description.trim();
        if (!normalizedDescription) {
            throw new Error('Project description cannot be empty.');
        }
        console.log(chalk_1.default.blue('Generating context files...'));
        for (const fileName of fileTypes) {
            console.log(chalk_1.default.gray(` - Generating ${fileName}...`));
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
                await this.fsm.writeContextFile(fileName, finalContent);
                console.log(chalk_1.default.green(`   [OK] ${fileName} saved.`));
            }
            catch (error) {
                console.error(chalk_1.default.red(`   [ERR] Error generating ${fileName}:`), error.message);
                const fallbackContent = this.getFallbackContentForFile(fileName, normalizedDescription);
                await this.fsm.writeContextFile(fileName, fallbackContent);
                console.log(chalk_1.default.yellow(`   [WARN] ${fileName} saved with fallback template.`));
            }
        }
        console.log(chalk_1.default.blue('\nContext generation complete!'));
    }
    /**
     * Generates context by reading all .md files in a directory.
     */
    async generateFromFolder(dirPath) {
        console.log(chalk_1.default.blue(`Reading all .md files in ${dirPath}...`));
        try {
            const allFiles = await this.walkDirectory(dirPath);
            const chunks = [];
            const dedupe = new Set();
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
                const relativeFile = path_1.default.relative(dirPath, filePath).split(path_1.default.sep).join('/');
                chunks.push(`--- FILE: ${relativeFile} ---\n${content}`);
            }
            if (chunks.length === 0) {
                throw new Error(`No valid markdown files found in ${dirPath}`);
            }
            await this.generateContext(chunks.join('\n\n'));
        }
        catch (error) {
            console.error(chalk_1.default.red(`Error reading folder: ${error.message}`));
        }
    }
    /**
     * Synchronizes context files based on recent memory entries.
     * This ensures that decisions recorded in memory are reflected in architecture, stack, etc.
     */
    async syncFromMemory() {
        console.log(chalk_1.default.blue('Synchronizing context with project memory...'));
        try {
            const decisions = await this.fsm.readMemory('decisions');
            const learnings = await this.fsm.readMemory('learnings');
            const contextFiles = await this.fsm.readContext();
            if (!decisions && !learnings) {
                console.log(chalk_1.default.yellow('No memory found to synchronize.'));
                return;
            }
            for (const [fileName, content] of Object.entries(contextFiles)) {
                console.log(chalk_1.default.gray(` - Checking if ${fileName} needs updates...`));
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
                    console.log(chalk_1.default.green(`   [OK] ${fileName} synchronized.`));
                }
                else {
                    console.log(chalk_1.default.gray(`   [SKIP] No changes needed for ${fileName}.`));
                }
            }
        }
        catch (error) {
            console.error(chalk_1.default.red('Context synchronization failed:'), error.message);
        }
    }
    async walkDirectory(dirPath) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            const fullPath = path_1.default.join(dirPath, entry.name);
            if (await this.fsm.isGitIgnored(fullPath)) {
                continue;
            }
            if (entry.isDirectory()) {
                files.push(...(await this.walkDirectory(fullPath)));
            }
            else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
        return files;
    }
    getSystemPromptForFile(fileName) {
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
    validateContextMarkdown(fileName, content, description) {
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
    getFallbackContentForFile(fileName, description) {
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
    logTokenEstimate(label, value) {
        const approxTokens = Math.ceil((value || '').length / 4);
        console.log(chalk_1.default.gray(` - ${label} estimated tokens: ~${approxTokens}`));
    }
}
exports.ContextEngine = ContextEngine;
