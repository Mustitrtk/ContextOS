# ContextOS

ContextOS is an AI-powered project brain and context engineering CLI tool. It automates documentation, task management, and decision-tracking for your software projects.

## 🚀 Quick Start

```bash
npm install
npm run build
npx contextos init
```

## 🛠️ Setup

Create a `.env` file in the root directory:

```env
# --- FREE MODELS (No Key Required) ---
# Uses Pollinations.ai by default.
FREE_LLM_MODEL=openai 

# --- PRO MODELS (Requires API Key) ---
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# --- LOCAL MODELS (Self-Hosted) ---
LOCAL_LLM_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=local-model
```

## 🕹️ Commands

### 1. Initialize Project (`init`)
The `init` command is now **fully interactive**. It will guide you through:
- **Cleaning**: Option to clear existing context files.
- **Provider Selection**: Choose between **Free**, **Pro**, or **Local** LLMs.
- **Context Building**:
    - **Text**: Enter a description manually.
    - **File**: Load from an existing `.md` file.
    - **Folder**: Analyze all `.md` files in a project folder to build context.

```bash
npx contextos init
```
*Direct flags are still supported for automation: `--text`, `--md`, `--llm`.*

### 2. Run Agent (`run`)
Generates an actionable task list (`tasks.md`) based on your project context.
```bash
npx contextos run
# or force a specific mode
npx contextos run --llm pro
```
Supported `--llm` values: `free`, `pro`, `local`, `openai`, `gemini`, `anthropic`, `pollinations`.

### 3. Clear Context (`clear`)
Surgical command to wipe all generated context files in `.ai/context/`.
```bash
npx contextos clear
```

### 4. Manage Memory (`memory`)
Maintain a persistent log of decisions and learnings.
- **Add**: `npx contextos memory add "We chose PostgreSQL for scalability."`
- **List**: `npx contextos memory list`
- **Clear**: `npx contextos memory clear`
- **Quick Inject**: `npx contextos /memory "We should ship the MVP first."`

When using folder-based initialization, files and folders that match `.gitignore` are skipped automatically.

## 🧠 LLM Selection Logic

ContextOS is designed to be flexible:
- **Free**: No keys needed. Uses public APIs (Pollinations).
- **Pro**: High-quality reasoning using Gemini (Free tier available) or OpenAI.
- **Local**: Complete privacy. Connects to your local LLM (LM Studio, Ollama, etc.).

## 🏗️ Tech Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **CLI Framework**: Commander.js & Inquirer.js
- **Styling**: Chalk

## 📄 License
MIT
