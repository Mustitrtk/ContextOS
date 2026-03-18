import { FileSystemManager } from '../src/core/FileSystemManager';
import { ContextEngine } from '../src/engines/ContextEngine';
import { PollinationsProvider } from '../src/core/PollinationsProvider';
import * as path from 'path';

async function sync() {
  const fsm = new FileSystemManager();
  await fsm.ensureStructure();
  
  const provider = new PollinationsProvider('openai');
  const contextEngine = new ContextEngine(provider, fsm);

  console.log('Syncing context from docs/ folder...');
  await contextEngine.generateFromFolder(path.resolve('docs'));
  console.log('Sync complete.');
}

sync().catch(console.error);
