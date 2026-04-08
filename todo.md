# ContextOS Project TODO

## Phase 1: AI Project Brain (MVP)

### Core Infrastructure
- [x] Implement **LLM Abstraction Layer** to support multiple providers (OpenAI, Local, etc.)
- [x] Set up directory structure management for `.ai/context/`, `.ai/tasks/`, and `.ai/memory/`
- [x] Implement `.gitignore` awareness for all file operations

### CLI Development
- [x] Implement `contextos init --md <path>` command (Base structure implemented)
- [x] Implement `contextos init --text <string>` command (Base structure implemented)
- [x] Implement `contextos run --llm <provider>` command
- [x] Implement `/memory <text>` command for manual injection

### Context Generator
- [x] Develop logic to parse project descriptions and generate `architecture.md`, `stack.md`, `rules.md`, and `features.md` in `.ai/context/`

### Agent Implementation
- [x] Implement **Read Context** step: Load all files from `.ai/context/`
- [x] Implement **Generate Tasks** step: LLM-based task extraction to `.ai/tasks/tasks.md`
- [x] Implement **Update Memory** step: Logic to record decisions and learnings in `.ai/memory/` after task execution
- [x] Implement **Execute Tasks** loop with idempotency and clear communication

### Advanced Relationship & Automation (New)
- [x] **(A) Task Automation & Memory Connection**: Enhanced `run` loop that queries memory for each task.
- [x] **(B) Context Sync**: Automatically update `architecture.md`, `stack.md`, etc., when critical decisions are added to memory.
- [x] **(C) Task Validation**: Implement a "Validator" pass to ensure generated tasks strictly follow `rules.md`.

### Rules & Validation
- [ ] Enforce "Context is King" rule in agent prompts
- [ ] Implement "Memory First" lookup before task execution
- [ ] Ensure all generated tasks are clear and actionable units of work


### Documentation
- [x] Create Readme.md for how to use the project

### Client Asks
- [x] Add more LLM models to support on LLM Factory.ts (Added Anthropic and Local)
- [x] Users can use free models, make support free models (Added Gemini and Local LLM support)
- [x] Implement flexible model selection (Free, Premium, Local) via CLI flags
- [x] Update README.md with instructions for manual model selection and fallback logic
- [x] Ensure Local LLM (localhost) integration is fully accessible via .env or flags
- [x] Simple run command need for free, pro or local llm models
- [x] Need clear context command for clear inside md files in .ai/context folder
- [x] Interactive CLI flow for initialization (Clear context, Select LLM, Select Method)
- [x] Support for initializing context by reading existing project .md files
- [x] Interactive memory management (add, list)
- [x] Add memory clear command.

### Feedback
- [x] Review **architecture.md output**: Ensure clean architecture layers are correctly defined
- [x] Validate **features.md tasks**: Check that AI-generated tasks are specific and actionable
- [x] Enforce **rules.md guidelines**: Confirm coding standards and AI execution constraints are applied
- [x] Check **stack.md setup**: Verify backend, database, and AI integration are consistent
- [x] Test **AI output formatting**: Ensure raw markdown/code is generated without JSON or reasoning metadata
- [x] Monitor **token usage**: Identify prompts that cause excessive token consumption and optimize
- [x] Review **modular file references**: Make sure AI correctly references plans, rules, and architecture files
- [x] Evaluate **edge case handling**: Confirm AI suggestions handle empty, duplicate, or invalid inputs
---
*Note: Always read `.md` files in `docs/` to synchronize with the latest project architecture and rules.*
