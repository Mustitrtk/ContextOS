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
exports.CodebaseScanner = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class CodebaseScanner {
    constructor(fsm) {
        this.maxDepth = 4;
        this.maxSampleFileBytes = 3000;
        this.maxTotalSampleFiles = 20;
        this.maxTotalChars = 30000;
        this.fsm = fsm;
    }
    /**
     * Scans an existing codebase and returns a structured string overview
     * containing directory structure, config files, and representative source snippets.
     */
    async scanCodebase(targetDir) {
        const rootPath = path.resolve(targetDir);
        if (!(await fs.pathExists(rootPath))) {
            throw new Error(`Directory does not exist: ${targetDir}`);
        }
        const sections = [];
        // 1. Directory Tree
        const tree = await this.buildDirectoryTree(rootPath, rootPath, 0);
        sections.push(`### Directory Structure\n\`\`\`\n${tree}\n\`\`\``);
        // 2. Configuration & Manifest Files
        const configContent = await this.readConfigFiles(rootPath);
        if (configContent) {
            sections.push(`### Project Configuration & Manifests\n${configContent}`);
        }
        // 3. Representative Source Code Samples
        const sourceSamples = await this.sampleSourceFiles(rootPath);
        if (sourceSamples) {
            sections.push(`### Key Source File Samples\n${sourceSamples}`);
        }
        // Enforce total character limit to prevent token overflow with free LLM providers
        let result = sections.join('\n\n');
        if (result.length > this.maxTotalChars) {
            result = result.slice(0, this.maxTotalChars);
            result += '\n\n> [NOTE] Codebase analysis was truncated to fit within LLM token limits. Use a Pro LLM for complete analysis.';
        }
        return result;
    }
    async buildDirectoryTree(dirPath, rootDir, currentDepth) {
        if (currentDepth > this.maxDepth) {
            return '  '.repeat(currentDepth) + '... (max depth reached)';
        }
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const lines = [];
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            // Skip common heavy or hidden folders
            if (entry.name === '.git' ||
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name === '.ai' ||
                entry.name === '.next' ||
                entry.name === 'build' ||
                entry.name === 'coverage') {
                continue;
            }
            if (await this.fsm.isGitIgnored(fullPath)) {
                continue;
            }
            const indent = '  '.repeat(currentDepth);
            if (entry.isDirectory()) {
                lines.push(`${indent}📁 ${entry.name}/`);
                const subTree = await this.buildDirectoryTree(fullPath, rootDir, currentDepth + 1);
                if (subTree.trim()) {
                    lines.push(subTree);
                }
            }
            else {
                lines.push(`${indent}📄 ${entry.name}`);
            }
        }
        return lines.join('\n');
    }
    async readConfigFiles(rootDir) {
        const targetConfigs = [
            'package.json',
            'tsconfig.json',
            'README.md',
            'Project.md',
            'docker-compose.yml',
            'Dockerfile',
            'pyproject.toml',
            'go.mod',
            'Cargo.toml',
            'pom.xml',
            'build.gradle',
            '.env.example'
        ];
        const results = [];
        for (const fileName of targetConfigs) {
            const filePath = path.join(rootDir, fileName);
            if (await fs.pathExists(filePath)) {
                if (await this.fsm.isGitIgnored(filePath)) {
                    continue;
                }
                try {
                    const stats = await fs.stat(filePath);
                    if (stats.size > 20000) {
                        // For large files, read first 200 lines
                        const content = await fs.readFile(filePath, 'utf8');
                        const truncated = content.split('\n').slice(0, 200).join('\n');
                        results.push(`#### ${fileName} (Truncated):\n\`\`\`\n${truncated}\n\`\`\``);
                    }
                    else {
                        const content = (await fs.readFile(filePath, 'utf8')).trim();
                        results.push(`#### ${fileName}:\n\`\`\`\n${content}\n\`\`\``);
                    }
                }
                catch (e) {
                    // Ignore read errors
                }
            }
        }
        return results.join('\n\n');
    }
    async sampleSourceFiles(rootDir) {
        const validExtensions = new Set([
            '.ts', '.js', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.kt', '.swift'
        ]);
        const fileList = [];
        await this.collectSourceFiles(rootDir, rootDir, fileList, validExtensions);
        const samples = [];
        const count = Math.min(fileList.length, this.maxTotalSampleFiles);
        for (let i = 0; i < count; i++) {
            const filePath = fileList[i];
            const relPath = path.relative(rootDir, filePath).split(path.sep).join('/');
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const snippet = content.length > this.maxSampleFileBytes
                    ? content.slice(0, this.maxSampleFileBytes) + '\n// ... [truncated]'
                    : content;
                samples.push(`#### FILE: ${relPath}\n\`\`\`\n${snippet.trim()}\n\`\`\``);
            }
            catch (e) {
                // Ignore read errors
            }
        }
        return samples.join('\n\n');
    }
    async collectSourceFiles(dirPath, rootDir, fileList, validExtensions) {
        if (fileList.length >= this.maxTotalSampleFiles * 2) {
            return;
        }
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.name === '.git' ||
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name === '.ai' ||
                entry.name === 'build' ||
                entry.name === 'coverage') {
                continue;
            }
            if (await this.fsm.isGitIgnored(fullPath)) {
                continue;
            }
            if (entry.isDirectory()) {
                await this.collectSourceFiles(fullPath, rootDir, fileList, validExtensions);
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (validExtensions.has(ext)) {
                    fileList.push(fullPath);
                }
            }
        }
    }
}
exports.CodebaseScanner = CodebaseScanner;
