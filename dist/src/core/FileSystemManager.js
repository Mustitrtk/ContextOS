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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemManager = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class FileSystemManager {
    constructor(baseDir = process.cwd()) {
        this.baseDir = baseDir;
        this.aiDir = path.join(this.baseDir, '.ai');
        this.contextDir = path.join(this.aiDir, 'context');
        this.tasksDir = path.join(this.aiDir, 'tasks');
        this.memoryDir = path.join(this.aiDir, 'memory');
    }
    /**
     * Initializes the .ai/ directory structure if it doesn't exist.
     */
    async ensureStructure() {
        await fs.ensureDir(this.aiDir);
        await fs.ensureDir(this.contextDir);
        await fs.ensureDir(this.tasksDir);
        await fs.ensureDir(this.memoryDir);
    }
    /**
     * Writes context files to .ai/context/
     */
    async writeContextFile(fileName, content) {
        const filePath = path.join(this.contextDir, fileName);
        await fs.writeFile(filePath, content, 'utf8');
    }
    /**
     * Writes tasks to .ai/tasks/tasks.md
     */
    async writeTasks(content) {
        const filePath = path.join(this.tasksDir, 'tasks.md');
        await fs.writeFile(filePath, content, 'utf8');
    }
    /**
     * Appends a decision or learning to the memory directory.
     */
    async appendMemory(type, content) {
        const fileName = `${type}.md`;
        const filePath = path.join(this.memoryDir, fileName);
        const timestamp = new Date().toISOString();
        const entry = `\n## ${timestamp}\n${content}\n`;
        await fs.appendFile(filePath, entry, 'utf8');
    }
    /**
     * Reads all context files.
     */
    async readContext() {
        const files = await fs.readdir(this.contextDir);
        const context = {};
        for (const file of files) {
            if (file.endsWith('.md')) {
                const content = await fs.readFile(path.join(this.contextDir, file), 'utf8');
                context[file] = content;
            }
        }
        return context;
    }
    getAiDir() {
        return this.aiDir;
    }
}
exports.FileSystemManager = FileSystemManager;
