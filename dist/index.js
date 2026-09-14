#!/usr/bin/env node
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
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const inquirer_1 = __importDefault(require("inquirer"));
const FileSystemManager_1 = require("./src/core/FileSystemManager");
const ContextEngine_1 = require("./src/engines/ContextEngine");
const TaskEngine_1 = require("./src/engines/TaskEngine");
const LLMUtils_1 = require("./src/utils/LLMUtils");
dotenv.config();
const program = new commander_1.Command();
const fsm = new FileSystemManager_1.FileSystemManager();
const llmChoices = ['free', 'pro', 'local', 'openai', 'gemini', 'anthropic', 'pollinations'];
async function addMemoryDecision(content, providerName) {
    if (!content || content.length === 0) {
        throw new Error('Please provide content to add to memory.');
    }
    const text = content.join(' ');
    await fsm.appendMemory('decisions', text);
    console.log(chalk_1.default.green('[OK] Memory added successfully.'));
    // Automatically sync context after memory addition (Point B)
    try {
        const provider = (0, LLMUtils_1.getLLMProvider)(providerName || 'free');
        const contextEngine = new ContextEngine_1.ContextEngine(provider, fsm);
        await contextEngine.syncFromMemory();
    }
    catch (error) {
        console.warn(chalk_1.default.yellow(`[WARN] Context sync skipped or failed: ${error.message}`));
    }
}
program
    .name('contextos')
    .description('AI Project Brain - Context Engineering CLI')
    .version('0.1.0');
program
    .command('init')
    .description('Initialize project context (Interactive)')
    .option('-t, --text <description>', 'Directly initialize with a text description')
    .option('-m, --md <path>', 'Directly initialize with a markdown file')
    .option('-s, --scan [path]', 'Scan existing codebase files & structure to generate context')
    .addOption(new commander_1.Option('-l, --llm <provider>', 'Directly specify the LLM provider').choices(llmChoices))
    .action(async (options) => {
    console.log(chalk_1.default.blue('--- ContextOS Initialization ---'));
    try {
        await fsm.ensureStructure();
        let providerName = options.llm;
        let method = '';
        let description = '';
        const contextDir = path.join(process.cwd(), '.ai', 'context');
        const files = await fs.readdir(contextDir);
        if (files.length > 0) {
            const { clear } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'clear',
                    message: 'Existing context files found. Clear them before proceeding?',
                    default: false
                }
            ]);
            if (clear) {
                await fsm.clearContext();
                console.log(chalk_1.default.green('[OK] Context files cleared.'));
            }
        }
        if (!providerName) {
            const { provider } = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'provider',
                    message: 'Select LLM Provider:',
                    choices: [
                        { name: 'Free (Pollinations - No key required)', value: 'free' },
                        { name: 'Pro (OpenAI/Gemini - Requires API Key)', value: 'pro' },
                        { name: 'Local (Localhost - Requires LOCAL_LLM_URL)', value: 'local' }
                    ]
                }
            ]);
            providerName = provider;
        }
        const provider = (0, LLMUtils_1.getLLMProvider)(providerName);
        const contextEngine = new ContextEngine_1.ContextEngine(provider, fsm);
        if (options.scan) {
            const scanPath = typeof options.scan === 'string' ? options.scan : './';
            await contextEngine.generateFromCodebase(path.resolve(scanPath));
            return;
        }
        else if (options.text) {
            description = options.text;
        }
        else if (options.md) {
            description = await fs.readFile(path.resolve(options.md), 'utf8');
        }
        else {
            const { initMethod } = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'initMethod',
                    message: 'How would you like to build the project context?',
                    choices: [
                        { name: 'Scan existing codebase (auto-detect stack & architecture)', value: 'scan' },
                        { name: 'Enter text description', value: 'text' },
                        { name: 'Load from a Markdown file', value: 'file' },
                        { name: 'Analyze existing project .md files', value: 'folder' }
                    ]
                }
            ]);
            method = initMethod;
            if (method === 'scan') {
                const { scanPath } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'scanPath',
                        message: 'Enter codebase directory path to scan:',
                        default: './',
                        validate: async (input) => (await fs.pathExists(input)) || 'Folder does not exist.'
                    }
                ]);
                await contextEngine.generateFromCodebase(path.resolve(scanPath));
                return;
            }
            else if (method === 'text') {
                const { text } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'text',
                        message: 'Enter project description:',
                        validate: (input) => input.length > 0 || 'Description cannot be empty.'
                    }
                ]);
                description = text;
            }
            else if (method === 'file') {
                const { filePath } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'filePath',
                        message: 'Enter the path to the .md file:',
                        validate: async (input) => (await fs.pathExists(input)) || 'File does not exist.'
                    }
                ]);
                description = await fs.readFile(path.resolve(filePath), 'utf8');
            }
            else if (method === 'folder') {
                const { folderPath } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'folderPath',
                        message: 'Enter project folder path (reads all .md files):',
                        default: './',
                        validate: async (input) => (await fs.pathExists(input)) || 'Folder does not exist.'
                    }
                ]);
                await contextEngine.generateFromFolder(path.resolve(folderPath));
                return;
            }
        }
        await contextEngine.generateContext(description);
    }
    catch (error) {
        console.error(chalk_1.default.red('Initialization failed:'), error.message);
        process.exitCode = 1;
    }
});
program
    .command('run')
    .description('Run the Agent Loop (Use --llm free, pro, or local)')
    .addOption(new commander_1.Option('-l, --llm <provider>', 'LLM provider: free, pro, local, openai, gemini, anthropic, pollinations').choices(llmChoices))
    .action(async (options) => {
    console.log(chalk_1.default.blue('ContextOS Agent starting...'));
    try {
        const provider = (0, LLMUtils_1.getLLMProvider)(options.llm);
        const taskEngine = new TaskEngine_1.TaskEngine(provider, fsm);
        await taskEngine.runAgentLoop();
    }
    catch (error) {
        console.error(chalk_1.default.red('Agent execution failed:'), error.message);
        process.exitCode = 1;
    }
});
program
    .command('clear')
    .description('Clear all generated context files in .ai/context/')
    .action(async () => {
    console.log(chalk_1.default.blue('Clearing ContextOS context files...'));
    try {
        await fsm.clearContext();
        console.log(chalk_1.default.green('[OK] Context files cleared successfully.'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Clear failed:'), error.message);
        process.exitCode = 1;
    }
});
program
    .command('tasks')
    .description('Manage project tasks (add, list, clear)')
    .argument('<action>', 'Action to perform: add, list or clear')
    .argument('[content...]', 'Task description (for "add" action)')
    .action(async (action, content) => {
    try {
        await fsm.ensureStructure();
        if (action === 'add') {
            if (!content || content.length === 0) {
                throw new Error('Please provide a task description.');
            }
            await fsm.appendTask(content.join(' '));
            console.log(chalk_1.default.green('[OK] Task added successfully.'));
        }
        else if (action === 'list') {
            const tasks = await fsm.readTasks();
            if (tasks) {
                console.log(chalk_1.default.blue('\n--- Project Tasks ---'));
                console.log(tasks);
            }
            else {
                console.log(chalk_1.default.yellow('No tasks found.'));
            }
        }
        else if (action === 'clear') {
            const cleared = await fsm.clearTasks();
            if (cleared) {
                console.log(chalk_1.default.green('[OK] Generated tasks cleared successfully.'));
            }
            else {
                console.log(chalk_1.default.yellow('No tasks.md file found to clear.'));
            }
        }
        else {
            throw new Error(`Unknown action: ${action}. Use "add", "list" or "clear".`);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Task operation failed:'), error.message);
        process.exitCode = 1;
    }
});
program
    .command('memory')
    .description('Manage project memory (add, list, clear)')
    .argument('<action>', 'Action to perform: add, list or clear')
    .argument('[content...]', 'Content to add (for "add" action)')
    .action(async (action, content) => {
    try {
        await fsm.ensureStructure();
        if (action === 'add') {
            await addMemoryDecision(content);
        }
        else if (action === 'list') {
            const decisions = await fsm.readMemory('decisions');
            const learnings = await fsm.readMemory('learnings');
            if (decisions || learnings) {
                console.log(chalk_1.default.blue('\n--- Project Memory ---'));
                if (decisions) {
                    console.log(chalk_1.default.cyan('\nDecisions:'));
                    console.log(decisions);
                }
                if (learnings) {
                    console.log(chalk_1.default.cyan('\nLearnings:'));
                    console.log(learnings);
                }
            }
            else {
                console.log(chalk_1.default.yellow('No memory records found.'));
            }
        }
        else if (action === 'clear') {
            await fsm.clearMemory();
            console.log(chalk_1.default.green('[OK] Project memory cleared successfully.'));
        }
        else {
            console.log(chalk_1.default.red(`Unknown action: ${action}. Use "add", "list" or "clear".`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Memory operation failed:'), error.message);
        process.exitCode = 1;
    }
});
program
    .command('/memory')
    .description('Quick command for manual memory injection: /memory <text>')
    .argument('<content...>', 'Memory text to inject into decisions log')
    .action(async (content) => {
    try {
        await fsm.ensureStructure();
        await addMemoryDecision(content);
    }
    catch (error) {
        console.error(chalk_1.default.red('Memory operation failed:'), error.message);
        process.exitCode = 1;
    }
});
const dev = program.command('dev').description('Development tools');
dev
    .command('create-agent')
    .description('Create a new agent based on context')
    .addOption(new commander_1.Option('-l, --llm <provider>', 'LLM provider').choices(llmChoices))
    .action(async (options) => {
    console.log(chalk_1.default.blue('Creating a new agent...'));
    try {
        const provider = (0, LLMUtils_1.getLLMProvider)(options.llm || 'free');
        const contextFiles = await fsm.readContext();
        const systemPrompt = 'You are an agent factory. Based on the project context, define a new specialized agent.';
        const userPrompt = `Project Context:\n${JSON.stringify(contextFiles)}\n\nDefine a new agent in markdown format.`;
        const response = await provider.generateCompletion(systemPrompt, userPrompt);
        await fsm.writeContextFile('agents.md', response.content);
        console.log(chalk_1.default.green('[OK] Agent created and saved to .ai/context/agents.md'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to create agent:'), error.message);
        process.exitCode = 1;
    }
});
const test = program.command('test').description('Testing tools');
test
    .command('run')
    .description('Run project tests')
    .action(async () => {
    console.log(chalk_1.default.blue('Running project tests...'));
    try {
        const { execSync } = require('child_process');
        execSync('npm test', { stdio: 'inherit' });
    }
    catch (error) {
        console.error(chalk_1.default.red('Tests failed or no "test" script found in package.json.'));
        process.exitCode = 1;
    }
});
const doc = program.command('doc').description('Documentation tools');
doc
    .command('generate')
    .description('Generate/Update project documentation')
    .addOption(new commander_1.Option('-l, --llm <provider>', 'LLM provider').choices(llmChoices))
    .action(async (options) => {
    console.log(chalk_1.default.blue('Generating/Updating documentation...'));
    try {
        const provider = (0, LLMUtils_1.getLLMProvider)(options.llm || 'free');
        const contextEngine = new ContextEngine_1.ContextEngine(provider, fsm);
        await contextEngine.syncFromMemory();
        console.log(chalk_1.default.green('[OK] Documentation updated based on memory.'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Documentation generation failed:'), error.message);
        process.exitCode = 1;
    }
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
