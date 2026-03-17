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
exports.ContextEngine = void 0;
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
class ContextEngine {
    constructor(llm, fsm) {
        this.llm = llm;
        this.fsm = fsm;
    }
    /**
     * Generates the project's foundation context files.
     * @param description A project description (text or markdown file content).
     */
    async generateContext(description) {
        const fileTypes = ['architecture.md', 'stack.md', 'rules.md', 'features.md'];
        console.log(chalk_1.default.blue('Generating context files...'));
        for (const fileName of fileTypes) {
            console.log(chalk_1.default.gray(` - Generating ${fileName}...`));
            const systemPrompt = this.getSystemPromptForFile(fileName);
            const userPrompt = `Project Description:\n\n${description}`;
            try {
                const response = await this.llm.generateCompletion(systemPrompt, userPrompt);
                await this.fsm.writeContextFile(fileName, response.content);
                console.log(chalk_1.default.green(`   ✓ ${fileName} saved.`));
            }
            catch (error) {
                console.error(chalk_1.default.red(`   ✗ Error generating ${fileName}:`), error.message);
            }
        }
        console.log(chalk_1.default.blue('\nContext generation complete!'));
    }
    /**
     * Generates context by reading all .md files in a directory.
     */
    async generateFromFolder(dirPath) {
        console.log(chalk_1.default.blue(`Reading all .md files in ${dirPath}...`));
        try {
            const files = await fs.readdir(dirPath);
            let combinedContent = '';
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const content = await fs.readFile(path_1.default.join(dirPath, file), 'utf8');
                    combinedContent += `--- FILE: ${file} ---\n${content}\n\n`;
                }
            }
            if (!combinedContent) {
                throw new Error(`No markdown files found in ${dirPath}`);
            }
            await this.generateContext(combinedContent);
        }
        catch (error) {
            console.error(chalk_1.default.red(`Error reading folder: ${error.message}`));
        }
    }
    getSystemPromptForFile(fileName) {
        const basePrompt = "You are a senior software architect. Based on the following project description, generate a detailed markdown file named ";
        switch (fileName) {
            case 'architecture.md':
                return `${basePrompt} architecture.md. Focus on high-level system components, data flow, and architectural patterns. Use structured headers and lists.`;
            case 'stack.md':
                return `${basePrompt} stack.md. Define the core technologies, languages, frameworks, and tools to be used. Justify the choices if necessary.`;
            case 'rules.md':
                return `${basePrompt} rules.md. Establish operational rules for the project, including coding standards, file structures, and agent behavior constraints.`;
            case 'features.md':
                return `${basePrompt} features.md. List and describe the key features and functionalities of the project, potentially broken down into phases.`;
            default:
                return `${basePrompt} ${fileName}. Be as detailed and structured as possible.`;
        }
    }
}
exports.ContextEngine = ContextEngine;
