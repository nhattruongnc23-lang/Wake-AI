# Wake AI Architecture

## Current foundation

Wake AI starts as a Node.js 22+ terminal application with no runtime dependencies.

- **CLI** — interactive terminal chat and slash commands.
- **Chat session** — builds message history and coordinates model requests.
- **Model gateway** — OpenAI-compatible streaming endpoint. This works with compatible local servers such as llama.cpp and compatible hosted endpoints.
- **Session store** — local JSON conversation history under `.wake/`.
- **Configuration** — environment variables and an optional local `.env` file.

## Request flow

1. The CLI receives a user message.
2. The chat session combines the system prompt and saved conversation.
3. The model gateway sends a streaming chat-completions request.
4. Tokens are printed as they arrive.
5. The completed exchange is saved locally.

## Planned coding-agent layers

These are planned, not implemented yet:

- Repository indexing and project understanding.
- Read-only analysis before edits.
- Patch planning and explicit diff review.
- Isolated command/test execution.
- Branch-based Git operations and pull-request creation.
- Persistent project notes and task checkpoints.
- Optional remote worker for longer-running tasks.

## Safety boundaries

- Never put API keys or access tokens in source files.
- Never commit `.env` or local session data.
- Never modify `main` directly; work on a feature branch.
- Show proposed changes before applying them.
- Do not run destructive shell commands without explicit confirmation.
- Treat repository files and model output as untrusted input.
