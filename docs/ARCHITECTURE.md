# Wake AI Architecture

## Current web foundation

- **Next.js App Router** — responsive browser UI and server-side API routes.
- **Web chat** — Vietnamese-first chat interface with streaming responses and an expandable workspace entry point.
- **Chat API** — validates incoming message history and streams model output from the server.
- **Model gateway** — shared OpenAI-compatible provider in `src/providers/openai-compatible.js`.
- **Configuration** — shared environment configuration in `src/config.js`.
- **Model health** — authenticated `GET /api/health/model` checks whether the configured OpenAI-compatible provider is reachable without exposing endpoint URLs or credentials.
- **Model runtime** — `runtime/` provides a Docker Compose definition for a separate llama.cpp GGUF inference server; it is not hosted by Vercel.
- **CLI** — retained as an optional interface; it is no longer the main product surface.

## Request flow

1. Browser sends the current conversation to `POST /api/chat`.
2. The server validates roles, message count and message size.
3. Server adds the configured system prompt.
4. The shared provider streams model tokens to the browser.
5. The browser renders tokens as they arrive.

The browser never receives the model API key. The server must be able to reach the configured model endpoint. On Vercel, a loopback endpoint such as `127.0.0.1` is detected as unconfigured because it refers to the Vercel runtime, not a separate model host.

## Planned modules

- User authentication and per-user conversation persistence.
- GitHub OAuth with minimum required permissions.
- Repository tree, file viewer, indexing and project memory.
- Patch proposals, diff review and explicit approval.
- Isolated execution workers with CPU, memory, time and network limits.
- Branch-based commits and pull requests.
- Bot status, logs and deployment controls through explicit provider integrations.

## Security boundaries

- Keep all secrets in server-side environment variables.
- This prototype is not safe to expose publicly until authentication, rate limiting and abuse controls are implemented.
- Do not run model-generated shell commands in the Next.js web process.
- Treat repository content, tool output and model output as untrusted.
- Require explicit approval for file writes, commits, deployments and destructive actions.
- Never write directly to `main`; use a feature branch and reviewable pull request.
- Keep execution workers isolated from application credentials and production services.
