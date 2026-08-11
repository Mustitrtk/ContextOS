#!/usr/bin/env node

import { Command, Option } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import { FileSystemManager } from './src/core/FileSystemManager';
import { ContextEngine } from './src/engines/ContextEngine';
import { TaskEngine } from './src/engines/TaskEngine';
import { getLLMProvider } from './src/utils/LLMUtils';

dotenv.config();

const program = new Command();
const fsm = new FileSystemManager();
const llmChoices = ['free', 'pro', 'local', 'openai', 'gemini', 'anthropic', 'pollinations'];

async function addMemoryDecision(content: string[], providerName?: string): Promise<void> {
  if (!content || content.length === 0) {
    console.log(chalk.red('Please provide content to add to memory.'));
    return;
  }

  const text = content.join(' ');
  await fsm.appendMemory('decisions', text);
  console.log(chalk.green('[OK] Memory added successfully.'));

  // Automatically sync context after memory addition (Point B)
  try {
    const provider = getLLMProvider(providerName || 'free');
    const contextEngine = new ContextEngine(provider, fsm);
    await contextEngine.syncFromMemory();
  } catch (error: any) {
    console.warn(chalk.yellow(`[WARN] Context sync skipped or failed: ${error.message}`));
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
  .addOption(
    new Option('-l, --llm <provider>', 'Directly specify the LLM provider').choices(llmChoices)
  )
  .action(async (options) => {
    console.log(chalk.blue('--- ContextOS Initialization ---'));

    try {
      await fsm.ensureStructure();

      let providerName = options.llm;
      let method = '';
      let description = '';

      const contextDir = path.join(process.cwd(), '.ai', 'context');
      const files = await fs.readdir(contextDir);
      if (files.length > 0) {
        const { clear } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'clear',
            message: 'Existing context files found. Clear them before proceeding?',
            default: false
          }
        ]);
        if (clear) {
          await fsm.clearContext();
          console.log(chalk.green('[OK] Context files cleared.'));
        }
      }

      if (!providerName) {
        const { provider } = await inquirer.prompt([
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

      const provider = getLLMProvider(providerName);
      const contextEngine = new ContextEngine(provider, fsm);

      if (options.scan) {
        const scanPath = typeof options.scan === 'string' ? options.scan : './';
        await contextEngine.generateFromCodebase(path.resolve(scanPath));
        return;
      } else if (options.text) {
        description = options.text;
      } else if (options.md) {
        description = await fs.readFile(path.resolve(options.md), 'utf8');
      } else {
        const { initMethod } = await inquirer.prompt([
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
          const { scanPath } = await inquirer.prompt([
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
        } else if (method === 'text') {
          const { text } = await inquirer.prompt([
            {
              type: 'input',
              name: 'text',
              message: 'Enter project description:',
              validate: (input) => input.length > 0 || 'Description cannot be empty.'
            }
          ]);
          description = text;
        } else if (method === 'file') {
          const { filePath } = await inquirer.prompt([
            {
              type: 'input',
              name: 'filePath',
              message: 'Enter the path to the .md file:',
              validate: async (input) => (await fs.pathExists(input)) || 'File does not exist.'
            }
          ]);
          description = await fs.readFile(path.resolve(filePath), 'utf8');
        } else if (method === 'folder') {
          const { folderPath } = await inquirer.prompt([
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
    } catch (error: any) {
      console.error(chalk.red('Initialization failed:'), error.message);
    }
  });

program
  .command('run')
  .description('Run the Agent Loop (Use --llm free, pro, or local)')
  .addOption(
    new Option('-l, --llm <provider>', 'LLM provider: free, pro, local, openai, gemini, anthropic, pollinations').choices(llmChoices)
  )
  .action(async (options) => {
    console.log(chalk.blue('ContextOS Agent starting...'));

    try {
      const provider = getLLMProvider(options.llm);
      const taskEngine = new TaskEngine(provider, fsm);
      await taskEngine.runAgentLoop();
    } catch (error: any) {
      console.error(chalk.red('Agent execution failed:'), error.message);
    }
  });

program
  .command('clear')
  .description('Clear all generated context files in .ai/context/')
  .action(async () => {
    console.log(chalk.blue('Clearing ContextOS context files...'));
    try {
      await fsm.clearContext();
      console.log(chalk.green('[OK] Context files cleared successfully.'));
    } catch (error: any) {
      console.error(chalk.red('Clear failed:'), error.message);
    }
  });

program
  .command('tasks')
  .description('Manage generated task files')
  .argument('<action>', 'Action to perform: clear')
  .action(async (action) => {
    try {
      await fsm.ensureStructure();

      if (action === 'clear') {
        const cleared = await fsm.clearTasks();
        if (cleared) {
          console.log(chalk.green('[OK] Generated tasks cleared successfully.'));
        } else {
          console.log(chalk.yellow('No tasks.md file found to clear.'));
        }
      } else {
        console.log(chalk.red(`Unknown action: ${action}. Use "clear".`));
      }
    } catch (error: any) {
      console.error(chalk.red('Task operation failed:'), error.message);
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
      } else if (action === 'list') {
        const decisions = await fsm.readMemory('decisions');
        const learnings = await fsm.readMemory('learnings');
        
        if (decisions || learnings) {
          console.log(chalk.blue('\n--- Project Memory ---'));
          if (decisions) {
            console.log(chalk.cyan('\nDecisions:'));
            console.log(decisions);
          }
          if (learnings) {
            console.log(chalk.cyan('\nLearnings:'));
            console.log(learnings);
          }
        } else {
          console.log(chalk.yellow('No memory records found.'));
        }
      } else if (action === 'clear') {
        await fsm.clearMemory();
        console.log(chalk.green('[OK] Project memory cleared successfully.'));
      } else {
        console.log(chalk.red(`Unknown action: ${action}. Use "add", "list" or "clear".`));
      }
    } catch (error: any) {
      console.error(chalk.red('Memory operation failed:'), error.message);
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
    } catch (error: any) {
      console.error(chalk.red('Memory operation failed:'), error.message);
    }
  });

const dev = program.command('dev').description('Development tools');
dev
  .command('create-agent')
  .description('Create a new agent based on context')
  .addOption(new Option('-l, --llm <provider>', 'LLM provider').choices(llmChoices))
  .action(async (options) => {
    console.log(chalk.blue('Creating a new agent...'));
    try {
      const provider = getLLMProvider(options.llm || 'free');
      const contextFiles = await fsm.readContext();
      const systemPrompt = 'You are an agent factory. Based on the project context, define a new specialized agent.';
      const userPrompt = `Project Context:\n${JSON.stringify(contextFiles)}\n\nDefine a new agent in markdown format.`;
      const response = await provider.generateCompletion(systemPrompt, userPrompt);
      await fsm.writeContextFile('agents.md', response.content);
      console.log(chalk.green('[OK] Agent created and saved to .ai/context/agents.md'));
    } catch (error: any) {
      console.error(chalk.red('Failed to create agent:'), error.message);
    }
  });

const test = program.command('test').description('Testing tools');
test
  .command('run')
  .description('Run project tests')
  .action(async () => {
    console.log(chalk.blue('Running project tests...'));
    try {
      const { execSync } = require('child_process');
      execSync('npm test', { stdio: 'inherit' });
    } catch (error: any) {
      console.error(chalk.red('Tests failed or no "test" script found in package.json.'));
    }
  });

const doc = program.command('doc').description('Documentation tools');
doc
  .command('generate')
  .description('Generate/Update project documentation')
  .addOption(new Option('-l, --llm <provider>', 'LLM provider').choices(llmChoices))
  .action(async (options) => {
    console.log(chalk.blue('Generating/Updating documentation...'));
    try {
      const provider = getLLMProvider(options.llm || 'free');
      const contextEngine = new ContextEngine(provider, fsm);
      await contextEngine.syncFromMemory();
      console.log(chalk.green('[OK] Documentation updated based on memory.'));
    } catch (error: any) {
      console.error(chalk.red('Documentation generation failed:'), error.message);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
