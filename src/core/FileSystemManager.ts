import * as fs from 'fs-extra';
import * as path from 'path';

export class FileSystemManager {
  private baseDir: string;
  private aiDir: string;
  private contextDir: string;
  private tasksDir: string;
  private memoryDir: string;
  private gitignorePatterns: string[] | null = null;

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
      const fullPath = path.join(this.contextDir, file);
      if (file.endsWith('.md') && !(await this.isGitIgnored(fullPath))) {
        const content = await fs.readFile(fullPath, 'utf8');
        context[file] = content;
      }
    }
    return context;
  }

  async readMemory(type: 'decisions' | 'learnings'): Promise<string> {
    const filePath = path.join(this.memoryDir, `${type}.md`);
    if (!(await fs.pathExists(filePath))) {
      return '';
    }
    return fs.readFile(filePath, 'utf8');
  }

  async isGitIgnored(targetPath: string): Promise<boolean> {
    const relPath = path.relative(this.baseDir, targetPath);
    if (!relPath || relPath.startsWith('..')) {
      return false;
    }

    const normalizedRelPath = relPath.split(path.sep).join('/');
    const patterns = await this.getGitignorePatterns();
    if (patterns.length === 0) {
      return false;
    }

    let ignored = false;
    for (const rawPattern of patterns) {
      const isNegation = rawPattern.startsWith('!');
      const pattern = isNegation ? rawPattern.slice(1) : rawPattern;

      if (this.matchesGitignorePattern(normalizedRelPath, pattern)) {
        ignored = !isNegation;
      }
    }

    return ignored;
  }

  private async getGitignorePatterns(): Promise<string[]> {
    if (this.gitignorePatterns !== null) {
      return this.gitignorePatterns;
    }

    const gitignorePath = path.join(this.baseDir, '.gitignore');
    if (!(await fs.pathExists(gitignorePath))) {
      this.gitignorePatterns = [];
      return this.gitignorePatterns;
    }

    const raw = await fs.readFile(gitignorePath, 'utf8');
    this.gitignorePatterns = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    return this.gitignorePatterns;
  }

  private matchesGitignorePattern(normalizedRelPath: string, pattern: string): boolean {
    const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalizedPattern) {
      return false;
    }

    if (normalizedPattern.endsWith('/')) {
      const dir = normalizedPattern.slice(0, -1);
      return normalizedRelPath === dir || normalizedRelPath.startsWith(`${dir}/`);
    }

    if (!normalizedPattern.includes('*')) {
      return normalizedRelPath === normalizedPattern || normalizedRelPath.startsWith(`${normalizedPattern}/`);
    }

    const escaped = normalizedPattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '§§DOUBLE_STAR§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§DOUBLE_STAR§§/g, '.*');

    const regex = new RegExp(`^${escaped}$`);
    return regex.test(normalizedRelPath);
  }

  getAiDir(): string {
    return this.aiDir;
  }
}
