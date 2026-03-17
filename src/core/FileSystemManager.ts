import * as fs from 'fs-extra';
import * as path from 'path';

export class FileSystemManager {
  private baseDir: string;
  private aiDir: string;
  private contextDir: string;
  private tasksDir: string;
  private memoryDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
    this.aiDir = path.join(this.baseDir, '.ai');
    this.contextDir = path.join(this.aiDir, 'context');
    this.tasksDir = path.join(this.aiDir, 'tasks');
    this.memoryDir = path.join(this.aiDir, 'memory');
  }

  /**
   * Initializes the .ai/ directory structure if it doesn't exist.
   */
  async ensureStructure(): Promise<void> {
    await fs.ensureDir(this.aiDir);
    await fs.ensureDir(this.contextDir);
    await fs.ensureDir(this.tasksDir);
    await fs.ensureDir(this.memoryDir);
  }

  /**
   * Writes context files to .ai/context/
   */
  async writeContextFile(fileName: string, content: string): Promise<void> {
    const filePath = path.join(this.contextDir, fileName);
    await fs.writeFile(filePath, content, 'utf8');
  }

  /**
   * Writes tasks to .ai/tasks/tasks.md
   */
  async writeTasks(content: string): Promise<void> {
    const filePath = path.join(this.tasksDir, 'tasks.md');
    await fs.writeFile(filePath, content, 'utf8');
  }

  /**
   * Appends a decision or learning to the memory directory.
   */
  async appendMemory(type: 'decisions' | 'learnings', content: string): Promise<void> {
    const fileName = `${type}.md`;
    const filePath = path.join(this.memoryDir, fileName);
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n${content}\n`;
    await fs.appendFile(filePath, entry, 'utf8');
  }

  /**
   * Reads all context files.
   */
  async readContext(): Promise<Record<string, string>> {
    const files = await fs.readdir(this.contextDir);
    const context: Record<string, string> = {};
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(this.contextDir, file), 'utf8');
        context[file] = content;
      }
    }
    return context;
  }

  getAiDir(): string {
    return this.aiDir;
  }
}
