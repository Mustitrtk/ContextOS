### Bugs
- [x] When i inputed detail about project, the context file couldn't create well (Fixed with Retry Logic in PollinationsProvider)
- [x] rules.md couldn't created. (Fixed by retry hardening in PollinationsProvider + fallback template write in ContextEngine when provider fails)
        --- Console Output ---
        ---
        npx contextos init
        [dotenv@17.3.1] injecting env (0) from .env -- tip: 🔐 encrypt with Dotenvx: https://dotenvx.com
        --- ContextOS Initialization ---
        ? Select LLM Provider: Free (Pollinations - No key required)
        LLM Provider: pollinations
        ? How would you like to build the project context? Enter text description
        ? Enter project description: i want to API with nodejs just say hello when i run. Port will be 3000

        Generating context files...
        - Generating architecture.md...
        ✓ architecture.md saved.
        - Generating stack.md...
        ✓ stack.md saved.
        - Generating rules.md...
        ✗ Error generating rules.md: Pollinations (Free API) failed: Request failed with status code 524
        - Generating features.md...
        ✓ features.md saved.

        Context generation complete!
        ---
