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
   * Appends a task to .ai/tasks/tasks.md
   */
  async appendTask(taskDescription: string): Promise<void> {
    const filePath = path.join(this.tasksDir, 'tasks.md');
    const taskEntry = `\n- [ ] ${taskDescription}`;
    if (!(await fs.pathExists(filePath))) {
      await fs.writeFile(filePath, `# Project Tasks\n${taskEntry}`, 'utf8');
    } else {
      await fs.appendFile(filePath, taskEntry, 'utf8');
    }
  }

  /**
   * Reads the current task list.
   */
  async readTasks(): Promise<string> {
    const filePath = path.join(this.tasksDir, 'tasks.md');
    if (!(await fs.pathExists(filePath))) {
      return '';
    }
    return fs.readFile(filePath, 'utf8');
  }

  /**
   * Clears the generated task list file while keeping the tasks directory.
   */
  async clearTasks(): Promise<boolean> {
    const filePath = path.join(this.tasksDir, 'tasks.md');
    if (!(await fs.pathExists(filePath))) {
      return false;
    }

    await fs.remove(filePath);
    return true;
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
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          const content = await fs.readFile(fullPath, 'utf8');
          context[file] = content;
        }
      }
    }
    return context;
  }

  async getConfig(): Promise<Record<string, any>> {
    const configPath = path.join(this.aiDir, 'config.json');
    if (!(await fs.pathExists(configPath))) {
      return {};
    }
    try {
      return await fs.readJson(configPath);
    } catch {
      return {};
    }
  }

  async saveConfig(config: Record<string, any>): Promise<void> {
    const configPath = path.join(this.aiDir, 'config.json');
    const existing = await this.getConfig();
    await fs.writeJson(configPath, { ...existing, ...config }, { spaces: 2 });
  }

  async readMemory(type: 'decisions' | 'learnings'): Promise<string> {
    const filePath = path.join(this.memoryDir, `${type}.md`);
    if (!(await fs.pathExists(filePath))) {
      return '';
    }
    return fs.readFile(filePath, 'utf8');
  }

  /**
   * Clears all context files in the context directory.
   */
  async clearContext(): Promise<void> {
    if (await fs.pathExists(this.contextDir)) {
      await fs.emptyDir(this.contextDir);
    }
  }

  /**
   * Clears all memory records in the memory directory.
   */
  async clearMemory(): Promise<void> {
    if (await fs.pathExists(this.memoryDir)) {
      await fs.emptyDir(this.memoryDir);
    }
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

    // Check if this is a basename-only pattern (no slash in pattern)
    const isBasenamePattern = !normalizedPattern.includes('/');
    const basename = normalizedRelPath.split('/').pop() || normalizedRelPath;

    if (normalizedPattern.endsWith('/')) {
      const dir = normalizedPattern.slice(0, -1);
      return normalizedRelPath === dir || normalizedRelPath.startsWith(`${dir}/`);
    }

    if (!normalizedPattern.includes('*')) {
      if (normalizedRelPath === normalizedPattern || normalizedRelPath.startsWith(`${normalizedPattern}/`)) {
        return true;
      }
      // For basename patterns without wildcards (e.g. '.env'), also match against basename
      if (isBasenamePattern && basename === normalizedPattern) {
        return true;
      }
      return false;
    }

    const escaped = normalizedPattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '§§DOUBLE_STAR§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§DOUBLE_STAR§§/g, '.*');

    const regex = new RegExp(`^${escaped}$`);
    if (regex.test(normalizedRelPath)) {
      return true;
    }

    // For basename-only glob patterns (e.g. '*.log'), also test against just the basename
    if (isBasenamePattern && regex.test(basename)) {
      return true;
    }

    return false;
  }

  getAiDir(): string {
    return this.aiDir;
  }
}
