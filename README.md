# ContextOS 🧠

**ContextOS** is an AI-powered project brain and context engineering CLI tool. It automates architecture documentation, task management, decision logging, and multi-file context synchronization for software projects.

---

## ✨ Features

- 🏗️ **Automated Context Engineering**: Generates foundational project context (`architecture.md`, `stack.md`, `rules.md`, `features.md`) in `.ai/context/`.
- 🔍 **Smart Codebase Scanner**: Auto-detects project structure, dependencies, configuration files, and representative source code while respecting `.gitignore`, max depth limits, and symlinks.
- 📋 **Task Management**: Extracts, normalizes, and tracks actionable units of work in `.ai/tasks/tasks.md` mapped to context references (`ref: architecture.md`).
- 🧠 **Persistent Memory**: Maintains a timestamped log of project decisions and learnings in `.ai/memory/` and synchronizes context when new decisions are made.
- ⚙️ **Project Configuration (`.ai/config.json`)**: Remembers active LLM settings so you don't need to specify `--llm` on every command.
- 🔌 **LLM Agnostic**: Supports **Free** (Pollinations - no key required), **Pro** (OpenAI, Gemini, Anthropic), and **Local** (LM Studio, Ollama, vLLM) providers with fallback chains.
- 🧪 **Built-in Automated Testing**: Includes a 35+ unit and integration test suite with `MockLLMProvider` (`npm test`).

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Initialize project context interactively
npx contextos init
```

---

## ⚙️ Setup & Configuration

Create a `.env` file in your project root:

```env
# --- FREE MODELS (No Key Required) ---
# Uses Pollinations.ai by default. Default free model is `openai`.
FREE_LLM_MODEL=openai

# --- PRO MODELS (Requires API Key) ---
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# --- LOCAL MODELS (Self-Hosted) ---
LOCAL_LLM_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=local-model
LOCAL_LLM_KEY=optional_local_api_key
```

### 📄 Persistent Config (`.ai/config.json`)
ContextOS saves your selected LLM provider in `.ai/config.json`:
```json
{
  "llmProvider": "free",
  "updatedAt": "2026-09-19T17:00:00.000Z"
}
```

---

## 📖 Commands Reference

### 1. Initialize Project (`init`)
Interactive wizard to build context from text, markdown files, folders, or codebase scan.

```bash
# Interactive mode
contextos init

# Codebase scan (auto-detect stack, architecture & files)
contextos init --scan .

# Preview generated context without writing to disk
contextos init --scan . --dry-run

# Direct text or markdown file
contextos init --text "Building a Node.js REST API with Express"
contextos init --md ./PRD.md --llm pro
```

**Supported `--llm` values**: `free`, `pro`, `local`, `openai`, `gemini`, `anthropic`, `pollinations`.

---

### 2. Run Agent Loop (`run`)
Generates or executes tasks from `.ai/tasks/tasks.md` based on project context and memory.

```bash
# Run with default or configured LLM
contextos run

# Preview next task execution without updating task status
contextos run --dry-run

# Force a specific provider
contextos run --llm pro
```

**Rules Enforced**:
- **Context is King**: Tasks must map back to files in `.ai/context/`.
- **Memory First**: Checks `.ai/memory/decisions.md` & `learnings.md` before execution.
- **Actionable Tasks**: Normalizes verbs (English & Turkish) and maintains phase headers.

---

### 3. Dashboard & Status (`status`)
Display a rich console dashboard showing configured LLM, context files, task progress bar, and memory stats.

```bash
contextos status
```

---

### 4. Project Config (`config`)
Manage project settings saved in `.ai/config.json`.

```bash
# List configuration
contextos config list

# Set default LLM provider
contextos config set llmProvider pro

# Get specific config value
contextos config get llmProvider
```

---

### 5. Manage Tasks (`tasks`)
Manage the actionable task list.

```bash
# Add a new task
contextos tasks add "Implement JWT authentication middleware"

# List project tasks
contextos tasks list

# Revert / Undo last completed task [x] -> [- ]
contextos tasks undo

# Clear all tasks
contextos tasks clear
```

---

### 4. Manage Memory (`memory`)
Log and inspect persistent decisions and learnings.

```bash
# Add a project decision (automatically triggers context sync)
contextos memory add "We decided to use PostgreSQL for relational data."

# Quick injection shortcut
contextos /memory "Focus on MVP release before optimizing cache."

# List memory logs
contextos memory list

# Clear memory
contextos memory clear
```

---

### 5. Clear Context (`clear`)
Clears all generated context files in `.ai/context/`.

```bash
contextos clear
```

---

### 6. Development Tools (`dev`)
```bash
# Create a specialized agent based on context
contextos dev create-agent --llm pro
```

---

### 7. Documentation Sync (`doc`)
```bash
# Synchronize architecture and stack docs with memory logs
contextos doc generate
```

---

### 8. Testing Tools (`test`)
```bash
# Run unit and integration test suite via CLI
contextos test run

# Or directly via npm
npm test
```

---

## 📁 Directory Structure (`.ai/`)

```text
.ai/
├── config.json          # Persistent CLI & LLM settings
├── context/
│   ├── architecture.md  # System layers, data flow, component boundaries
│   ├── stack.md         # Technology stack & dependencies
│   ├── rules.md         # Coding standards & execution constraints
│   └── features.md      # Testable project features by phase
├── tasks/
│   └── tasks.md         # Mapped actionable task checklist (- [ ])
└── memory/
    ├── decisions.md     # Architectural and product decisions
    └── learnings.md     # Task execution logs & AI learnings
```

---

## 🤖 LLM Routing Logic

- **Free Mode**: Uses Pollinations.ai text API (No API Key required, automatic retries with exponential backoff).
- **Pro Mode**: Routes to Gemini, OpenAI, or Anthropic depending on API keys present in `.env`.
- **Local Mode**: Connects to self-hosted OpenAI-compatible endpoints (LM Studio, Ollama, vLLM).

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **CLI Framework**: Commander.js & Inquirer.js
- **Styling**: Chalk
- **HTTP Client**: Axios

---

## 📄 License

[MIT](LICENSE)
