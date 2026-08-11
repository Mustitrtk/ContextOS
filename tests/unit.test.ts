import { FileSystemManager } from '../src/core/FileSystemManager';
import { LLMFactory } from '../src/core/LLMFactory';
import { getLLMProvider } from '../src/utils/LLMUtils';
import { CodebaseScanner } from '../src/utils/CodebaseScanner';
import { ILLMProvider, LLMResponse } from '../src/core/types';
import * as path from 'path';
import * as fs from 'fs-extra';

class MockLLMProvider implements ILLMProvider {
  private name: string;
  constructor(name: string = 'mock-llm') {
    this.name = name;
  }
  getName(): string {
    return this.name;
  }
  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    if (systemPrompt.includes('architecture.md')) {
      return { content: '# Architecture\n\n## Clean Layers\n- CLI Layer\n- Core Engine Layer\n\n## Component Data Flow\nData flows from CLI to Engine.' };
    }
    if (systemPrompt.includes('stack.md')) {
      return { content: '# Stack\n\n## Node and TypeScript\nUsing Node.js runtime and TypeScript compiler with database layer.' };
    }
    if (systemPrompt.includes('rules.md')) {
      return { content: '# Rules\n\n## Rule Standard\nContext is king and memory first constraint.' };
    }
    if (systemPrompt.includes('features.md')) {
      return { content: '# Features\n\n## Phase 1 MVP\nImplement core CLI feature.' };
    }
    if (systemPrompt.includes('project manager agent') || userPrompt.includes('Generate tasks.md')) {
      return {
        content: [
          '# Phase 1: Core Setup',
          '- [ ] Implement core CLI command handler (ref: architecture.md)',
          '- [ ] Add unit test runner for core engines (ref: rules.md)'
        ].join('\n')
      };
    }
    if (systemPrompt.includes('execution agent')) {
      return { content: 'Execution Plan: Implemented command handler in src/index.ts successfully.' };
    }
    return { content: '# Generic Mock Output\n\nSample response content for testing.' };
  }
}

async function runUnitTests(): Promise<boolean> {
  console.log('\n========================================');
  console.log('🧪 RUNNING UNIT & MODULE TESTS');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const testDir = path.join(process.cwd(), 'temp_unit_test_env');

  try {
    // ----------------------------------------------------
    // Test 1: FileSystemManager Directory Structure
    // ----------------------------------------------------
    await fs.remove(testDir);
    const fsm = new FileSystemManager(testDir);
    await fsm.ensureStructure();

    assert(await fs.pathExists(path.join(testDir, '.ai')), 'FileSystemManager: Creates .ai directory');
    assert(await fs.pathExists(path.join(testDir, '.ai', 'context')), 'FileSystemManager: Creates .ai/context directory');
    assert(await fs.pathExists(path.join(testDir, '.ai', 'tasks')), 'FileSystemManager: Creates .ai/tasks directory');
    assert(await fs.pathExists(path.join(testDir, '.ai', 'memory')), 'FileSystemManager: Creates .ai/memory directory');

    // ----------------------------------------------------
    // Test 2: FileSystemManager Context & Tasks Reading/Writing
    // ----------------------------------------------------
    await fsm.writeContextFile('architecture.md', '# Test Architecture');
    const contextData = await fsm.readContext();
    assert(contextData['architecture.md'] === '# Test Architecture', 'FileSystemManager: Writes and reads context file');

    await fsm.writeTasks('- [ ] Test Task');
    const tasksContent = await fsm.readTasks();
    assert(tasksContent === '- [ ] Test Task', 'FileSystemManager: Writes and reads tasks.md');

    const cleared = await fsm.clearTasks();
    assert(cleared === true && (await fsm.readTasks()) === '', 'FileSystemManager: Clears tasks.md');

    // ----------------------------------------------------
    // Test 3: FileSystemManager Memory Management
    // ----------------------------------------------------
    await fsm.appendMemory('decisions', 'Decision: Chose PostgreSQL for DB');
    const memoryContent = await fsm.readMemory('decisions');
    assert(memoryContent.includes('Chose PostgreSQL for DB'), 'FileSystemManager: Appends and reads memory decisions');

    // ----------------------------------------------------
    // Test 4: FileSystemManager GitIgnore Filter
    // ----------------------------------------------------
    const gitignoreFile = path.join(testDir, '.gitignore');
    await fs.writeFile(gitignoreFile, 'node_modules/\n*.log\ndist/\n!important.log\n');
    
    // Reset cached gitignore patterns
    const fsmGit = new FileSystemManager(testDir);
    assert(await fsmGit.isGitIgnored(path.join(testDir, 'node_modules', 'express', 'index.js')), 'FileSystemManager gitignore: Ignores node_modules folder');
    assert(await fsmGit.isGitIgnored(path.join(testDir, 'app.log')), 'FileSystemManager gitignore: Ignores *.log files');
    assert(!await fsmGit.isGitIgnored(path.join(testDir, 'src', 'index.ts')), 'FileSystemManager gitignore: Allows src/index.ts');
    assert(!await fsmGit.isGitIgnored(path.join(testDir, 'important.log')), 'FileSystemManager gitignore: Honors negation !important.log');

    // ----------------------------------------------------
    // Test 5: LLMFactory Creation & Fallbacks
    // ----------------------------------------------------
    const pollinationsProvider = LLMFactory.create('pollinations', { model: 'openai' });
    assert(pollinationsProvider.getName() === 'pollinations', 'LLMFactory: Creates PollinationsProvider');

    const localProvider = LLMFactory.create('local', { baseUrl: 'http://localhost:1234/v1', model: 'local-model' });
    assert(localProvider.getName() === 'local', 'LLMFactory: Creates LocalProvider');

    // ----------------------------------------------------
    // Test 6: LLMUtils getLLMProvider Routing
    // ----------------------------------------------------
    const freeProvider = getLLMProvider('free');
    assert(freeProvider.getName() === 'pollinations', 'LLMUtils: "free" maps to PollinationsProvider');

    // Attempting openai without key should fallback to pollinations
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const fallbackProvider = getLLMProvider('openai');
    assert(fallbackProvider.getName() === 'pollinations', 'LLMUtils: Missing key falls back to PollinationsProvider');

    // ----------------------------------------------------
    // Test 7: CodebaseScanner
    // ----------------------------------------------------
    const scanner = new CodebaseScanner(fsm);
    const scanResult = await scanner.scanCodebase(process.cwd());
    assert(scanResult.includes('### Directory Structure'), 'CodebaseScanner: Generates Directory Structure');
    assert(scanResult.includes('### Project Configuration & Manifests'), 'CodebaseScanner: Finds project configs (package.json)');
    assert(scanResult.includes('### Key Source File Samples'), 'CodebaseScanner: Samples key source code files');

  } catch (err: any) {
    console.error(` ❌ CRITICAL UNHANDLED ERROR IN UNIT TESTS: ${err.message}\n${err.stack}`);
    failed++;
  } finally {
    await fs.remove(testDir);
  }

  console.log(`\n----------------------------------------`);
  console.log(`Unit Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`----------------------------------------\n`);
  return failed === 0;
}

runUnitTests().then((success) => {
  if (!success) {
    process.exit(1);
  }
});
