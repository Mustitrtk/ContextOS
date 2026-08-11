# ContextOS

ContextOS is an AI-powered project brain and context engineering CLI tool. It automates documentation, task management, and decision tracking for software projects.

## Quick Start

```bash
npm install
npm run build
npx contextos init
```

## Setup

Create a `.env` file in the root directory:

```env
# --- FREE MODELS (No Key Required) ---
# Uses Pollinations.ai by default. The default free model is `openai`
# unless you override it with another Pollinations-supported model name.
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

## Commands

### 1. Initialize Project (`init`)
The `init` command is interactive and can build context from:
- Scanning an existing codebase (auto-detects project structure, stack, config files & code)
- A direct text description
- An existing `.md` file
- A folder of project markdown files

```bash
npx contextos init
npx contextos init --scan .
```

Direct flags are also supported for automation: `--scan`, `--text`, `--md`, `--llm`.

### 2. Run Agent (`run`)
Generates or advances `.ai/tasks/tasks.md` based on project context and memory.

```bash
npx contextos run
npx contextos run --llm pro
```

Supported `--llm` values: `free`, `pro`, `local`, `openai`, `gemini`, `anthropic`, `pollinations`.

Task generation and execution follow these rules:
- Context is King: tasks must map back to files in `.ai/context/`.
- Memory First: `run` checks relevant entries in `.ai/memory/decisions.md` and `.ai/memory/learnings.md` before proposing execution.
- Actionable Tasks Only: vague items are filtered out, phase headers are enforced, and missing context refs are inferred or repaired.

### 3. Clear Context (`clear`)
Clears generated context files in `.ai/context/`.

```bash
npx contextos clear
```

### 4. Manage Tasks (`tasks`)
Manage generated task files.
- Clear: `npx contextos tasks clear`

### 5. Manage Memory (`memory`)
Maintain a persistent log of decisions and learnings.
- Add: `npx contextos memory add "We chose PostgreSQL for scalability."`
- List: `npx contextos memory list`
- Clear: `npx contextos memory clear`
- Quick inject: `npx contextos /memory "We should ship the MVP first."`

When using folder-based initialization, files and folders matching `.gitignore` are skipped automatically.

## LLM Selection Logic

ContextOS supports three routing modes:
- Free: no API key required, routed through Pollinations.
- Pro: prefers Gemini or OpenAI when API keys are available.
- Local: connects to a self-hosted compatible endpoint such as LM Studio or Ollama.

If an explicit provider is unavailable, ContextOS falls back through the configured provider chain.

## Tech Stack

- Runtime: Node.js
- Language: TypeScript
- CLI framework: Commander.js and Inquirer.js
- Console styling: Chalk

## License

MIT
