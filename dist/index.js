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
// CLI tanımlaması
const program = new commander_1.Command();
const fsm = new FileSystemManager_1.FileSystemManager();
program
    .name('contextos')
    .description('AI Project Brain - Context Engineering CLI')
    .version('0.1.0');
// --- INIT Command ---
program
    .command('init')
    .description('Initialize project context (Interactive)')
    .option('-t, --text <description>', 'Directly initialize with a text description')
    .option('-m, --md <path>', 'Directly initialize with a markdown file')
    .option('-l, --llm <provider>', 'Directly specify the LLM provider')
    .action(async (options) => {
    console.log(chalk_1.default.blue('--- ContextOS Initialization ---'));
    try {
        await fsm.ensureStructure();
        let providerName = options.llm;
        let method = '';
        let description = '';
        // 1. Clear Existing Context?
        const contextDir = path.join(process.cwd(), '.ai', 'context');
        const files = await fs.readdir(contextDir);
        if (files.length > 0) {
            const { clear } = await inquirer_1.default.prompt([{
                    type: 'confirm',
                    name: 'clear',
                    message: 'Existing context files found. Clear them before proceeding?',
                    default: false
                }]);
            if (clear) {
                await fs.emptyDir(contextDir);
                console.log(chalk_1.default.green('✓ Context files cleared.'));
            }
        }
        // 2. Select LLM Provider (if not provided)
        if (!providerName) {
            const { provider } = await inquirer_1.default.prompt([{
                    type: 'list',
                    name: 'provider',
                    message: 'Select LLM Provider:',
                    choices: [
                        { name: 'Free (Pollinations - No key required)', value: 'free' },
                        { name: 'Pro (OpenAI/Gemini - Requires API Key)', value: 'pro' },
                        { name: 'Local (Localhost - Requires LOCAL_LLM_URL)', value: 'local' }
                    ]
                }]);
            providerName = provider;
        }
        const provider = (0, LLMUtils_1.getLLMProvider)(providerName);
        const contextEngine = new ContextEngine_1.ContextEngine(provider, fsm);
        // 3. Select Initialization Method
        if (options.text) {
            description = options.text;
        }
        else if (options.md) {
            description = await fs.readFile(path.resolve(options.md), 'utf8');
        }
        else {
            const { initMethod } = await inquirer_1.default.prompt([{
                    type: 'list',
                    name: 'initMethod',
                    message: 'How would you like to build the project context?',
                    choices: [
                        { name: 'Enter text description', value: 'text' },
                        { name: 'Load from a Markdown file', value: 'file' },
                        { name: 'Analyze existing project .md files', value: 'folder' }
                    ]
                }]);
            method = initMethod;
            if (method === 'text') {
                const { text } = await inquirer_1.default.prompt([{
                        type: 'input',
                        name: 'text',
                        message: 'Enter project description:',
                        validate: (input) => input.length > 0 || 'Description cannot be empty.'
                    }]);
                description = text;
            }
            else if (method === 'file') {
                const { filePath } = await inquirer_1.default.prompt([{
                        type: 'input',
                        name: 'filePath',
                        message: 'Enter the path to the .md file:',
                        validate: async (input) => (await fs.pathExists(input)) || 'File does not exist.'
                    }]);
                description = await fs.readFile(path.resolve(filePath), 'utf8');
            }
            else if (method === 'folder') {
                const { folderPath } = await inquirer_1.default.prompt([{
                        type: 'input',
                        name: 'folderPath',
                        message: 'Enter project folder path (reads all .md files):',
                        default: './',
                        validate: async (input) => (await fs.pathExists(input)) || 'Folder does not exist.'
                    }]);
                await contextEngine.generateFromFolder(path.resolve(folderPath));
                return; // generateFromFolder handles its own completion
            }
        }
        await contextEngine.generateContext(description);
    }
    catch (error) {
        console.error(chalk_1.default.red('Initialization failed:'), error.message);
    }
});
// --- RUN Command ---
program
    .command('run')
    .description('Run the Agent Loop (Use --llm free, pro, or local)')
    .option('-l, --llm <provider>', 'LLM provider: free, pro, or local')
    .action(async (options) => {
    console.log(chalk_1.default.blue('ContextOS Agent starting...'));
    try {
        const provider = (0, LLMUtils_1.getLLMProvider)(options.llm);
        const taskEngine = new TaskEngine_1.TaskEngine(provider, fsm);
        // 2. Generate initial tasks if tasks.md doesn't exist or as first run
        await taskEngine.generateInitialTasks();
    }
    catch (error) {
        console.error(chalk_1.default.red('Agent execution failed:'), error.message);
    }
});
// --- CLEAR Command ---
program
    .command('clear')
    .description('Clear all generated context files in .ai/context/')
    .action(async () => {
    console.log(chalk_1.default.blue('Clearing ContextOS context files...'));
    try {
        const contextDir = path.join(process.cwd(), '.ai', 'context');
        if (await fs.pathExists(contextDir)) {
            await fs.emptyDir(contextDir);
            console.log(chalk_1.default.green('✓ Context files cleared successfully.'));
        }
        else {
            console.log(chalk_1.default.yellow('No context directory found to clear.'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Clear failed:'), error.message);
    }
});
// --- MEMORY Command ---
program
    .command('memory')
    .description('Manage project memory (add, list)')
    .argument('<action>', 'Action to perform: add or list')
    .argument('[content...]', 'Content to add (for "add" action)')
    .action(async (action, content) => {
    try {
        await fsm.ensureStructure();
        if (action === 'add') {
            if (!content || content.length === 0) {
                console.log(chalk_1.default.red('Please provide content to add to memory.'));
                return;
            }
            const text = content.join(' ');
            await fsm.appendMemory('decisions', text);
            console.log(chalk_1.default.green('✓ Memory added successfully.'));
        }
        else if (action === 'list') {
            const memoryPath = path.join(process.cwd(), '.ai', 'memory', 'decisions.md');
            if (await fs.pathExists(memoryPath)) {
                const data = await fs.readFile(memoryPath, 'utf8');
                console.log(chalk_1.default.blue('\n--- Project Memory ---'));
                console.log(data);
            }
            else {
                console.log(chalk_1.default.yellow('No memory records found.'));
            }
        }
        else {
            console.log(chalk_1.default.red(`Unknown action: ${action}. Use "add" or "list".`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Memory operation failed:'), error.message);
    }
});
program.parse(process.argv);
// If no arguments provided, display help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
