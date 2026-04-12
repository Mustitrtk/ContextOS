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
contextos init
```
*Direct flags are still supported for automation: `--text`, `--md`, `--llm`.*

### 2. Run Agent (`run`)
Generates an actionable task list (`tasks.md`) based on your project context.
```bash
contextos run
# or force a specific mode
contextos run --llm pro
```
Supported `--llm` values: `free`, `pro`, `local`, `openai`, `gemini`, `anthropic`, `pollinations`.

### 3. Clear Context (`clear`)
Surgical command to wipe all generated context files in `.ai/context/`.
```bash
contextos clear
```

### 4. Manage Tasks (`tasks`)
Manage the actionable project task list.
- **Add**: `contextos tasks add "Implement user authentication."`
- **List**: `contextos tasks list`
- **Clear**: `contextos tasks clear`

### 5. Manage Memory (`memory`)
Maintain a persistent log of decisions and learnings.
- **Add**: `contextos memory add "We chose PostgreSQL for scalability."`
- **List**: `contextos memory list`
- **Clear**: `contextos memory clear`
- **Quick Inject**: `contextos /memory "We should ship the MVP first."`

### 6. Development Tools (`dev`)
- **Create Agent**: `contextos dev create-agent` - Define a new specialized agent based on context.

### 7. Testing Tools (`test`)
- **Run**: `contextos test run` - Execute project tests.

### 8. Documentation Tools (`doc`)
- **Generate**: `contextos doc generate` - Update documentation based on memory and context.

When using folder-based initialization, files and folders that match `.gitignore` are skipped automatically.

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
