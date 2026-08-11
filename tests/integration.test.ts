import { FileSystemManager } from '../src/core/FileSystemManager';
import { ContextEngine } from '../src/engines/ContextEngine';
import { TaskEngine } from '../src/engines/TaskEngine';
import { ILLMProvider, LLMResponse } from '../src/core/types';
import * as path from 'path';
import * as fs from 'fs-extra';

class MockLLMProvider implements ILLMProvider {
  private name: string;
  public shouldFail: boolean = false;

  constructor(name: string = 'mock-llm') {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    if (this.shouldFail) {
      throw new Error('Simulated LLM Provider failure (HTTP 500 / Network Error)');
    }

    if (systemPrompt.includes('synchronization agent')) {
      if (userPrompt.includes('Existing architecture.md:')) {
        return { content: '# Architecture\n\n## Clean Layers\n- CLI Presentation Layer\n- Core Engine Layer\n- Synchronized Memory Layer\n\n## Component Data Flow\nData flows from CLI to Engine.' };
      }
      const match = userPrompt.match(/Existing [^:]+:\s*([\s\S]*?)\s*Project Memory/);
      return { content: match ? match[1].trim() : '' };
    }

    if (systemPrompt.includes('quality assurance agent')) {
      return {
        content: [
          '# Phase 1: Core Setup',
          '- [ ] Implement core CLI command handler (ref: architecture.md)',
          '- [ ] Add unit test runner for core engines (ref: rules.md)'
        ].join('\n')
      };
    }

    if (systemPrompt.includes('architecture.md')) {
      return { content: '# Architecture\n\n## Clean Layers\n- CLI Presentation Layer\n- Core Engine Layer\n\n## Component Data Flow\nData flows from CLI to Engine.' };
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

async function runIntegrationTests(): Promise<boolean> {
  console.log('\n========================================');
  console.log('🧪 RUNNING ENGINE & SYSTEM INTEGRATION TESTS');
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

  const testEnvDir = path.join(process.cwd(), 'temp_integration_test_env');

  try {
    await fs.remove(testEnvDir);
    await fs.ensureDir(testEnvDir);

    const fsm = new FileSystemManager(testEnvDir);
    await fsm.ensureStructure();

    const mockLLM = new MockLLMProvider();

    // ----------------------------------------------------
    // Test 1: ContextEngine text-based generation
    // ----------------------------------------------------
    const contextEngine = new ContextEngine(mockLLM, fsm);
    await contextEngine.generateContext('I want a Node.js REST API with Express on port 3000');

    const contextFiles = await fsm.readContext();
    assert(contextFiles['architecture.md'] !== undefined, 'ContextEngine: Generates architecture.md');
    assert(contextFiles['stack.md'] !== undefined, 'ContextEngine: Generates stack.md');
    assert(contextFiles['rules.md'] !== undefined, 'ContextEngine: Generates rules.md');
    assert(contextFiles['features.md'] !== undefined, 'ContextEngine: Generates features.md');
    assert(contextFiles['architecture.md'].includes('CLI Presentation Layer'), 'ContextEngine: Content matches LLM output');

    // ----------------------------------------------------
    // Test 2: TaskEngine initial task generation
    // ----------------------------------------------------
    const taskEngine = new TaskEngine(mockLLM, fsm);
    await taskEngine.generateInitialTasks();

    const initialTasks = await fsm.readTasks();
    assert(initialTasks.includes('Implement core CLI command handler'), 'TaskEngine: Generates initial tasks');
    assert(initialTasks.includes('(ref: architecture.md)'), 'TaskEngine: Tasks include context file references');

    // ----------------------------------------------------
    // Test 3: TaskEngine Agent execution loop (runAgentLoop)
    // ----------------------------------------------------
    await taskEngine.runAgentLoop();

    const updatedTasks = await fsm.readTasks();
    assert(updatedTasks.includes('- [x] Implement core CLI command handler'), 'TaskEngine: Marks completed task with [x]');
    assert(updatedTasks.includes('- [ ] Add unit test runner'), 'TaskEngine: Next task remains uncompleted [- ]');

    const learnings = await fsm.readMemory('learnings');
    assert(learnings.includes('Completed task: Implement core CLI command handler'), 'TaskEngine: Records completed task in learnings.md');

    // ----------------------------------------------------
    // Test 4: ContextEngine syncFromMemory
    // ----------------------------------------------------
    await fsm.appendMemory('decisions', 'Decision: Added Redis Caching Layer');
    await contextEngine.syncFromMemory();

    const syncedContext = await fsm.readContext();
    assert(syncedContext['architecture.md'].includes('Synchronized Memory Layer'), 'ContextEngine: Synchronizes architecture.md from memory decisions');

    // ----------------------------------------------------
    // Test 5: ContextEngine Fallback on LLM Failure
    // ----------------------------------------------------
    mockLLM.shouldFail = true;
    const testFallbackDir = path.join(process.cwd(), 'temp_fallback_test_env');
    await fs.remove(testFallbackDir);
    const fsmFallback = new FileSystemManager(testFallbackDir);
    await fsmFallback.ensureStructure();

    const fallbackContextEngine = new ContextEngine(mockLLM, fsmFallback);
    await fallbackContextEngine.generateContext('Sample project for fallback verification');

    const fallbackFiles = await fsmFallback.readContext();
    assert(fallbackFiles['architecture.md'].includes('# Project Architecture (Fallback)'), 'ContextEngine Resilience: Fallbacks to template on LLM failure for architecture.md');
    assert(fallbackFiles['rules.md'].includes('# Project Rules (Fallback)'), 'ContextEngine Resilience: Fallbacks to template on LLM failure for rules.md');
    await fs.remove(testFallbackDir);

    // ----------------------------------------------------
    // Test 6: ContextEngine folder-based generation (generateFromFolder)
    // ----------------------------------------------------
    mockLLM.shouldFail = false;
    const docsFolder = path.join(testEnvDir, 'input_md_folder');
    await fs.ensureDir(docsFolder);
    await fs.writeFile(path.join(docsFolder, 'spec.md'), '# Project Spec\n\nBuild a task scheduler CLI.');

    await contextEngine.generateFromFolder(docsFolder);
    const folderContextFiles = await fsm.readContext();
    assert(Object.keys(folderContextFiles).length === 4, 'ContextEngine: Generates context from markdown folder');

  } catch (err: any) {
    console.error(` ❌ CRITICAL UNHANDLED ERROR IN INTEGRATION TESTS: ${err.message}\n${err.stack}`);
    failed++;
  } finally {
    await fs.remove(testEnvDir);
  }

  console.log(`\n----------------------------------------`);
  console.log(`Integration Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`----------------------------------------\n`);
  return failed === 0;
}

runIntegrationTests().then((success) => {
  if (!success) {
    process.exit(1);
  }
});
