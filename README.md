# Wake AI

Personal AI coding agent for Wake. The first milestone is a lightweight terminal chat client designed to run in Termux and connect to any OpenAI-compatible model endpoint.

## Requirements

- Node.js 22.12 or newer
- An OpenAI-compatible chat-completions endpoint
- A model served by that endpoint

## Quick start

```bash
git clone https://github.com/nhattruongnc23-lang/Wake-AI.git
cd Wake-AI
git switch feat/wake-cli-foundation
cp .env.example .env
```

Edit `.env` and set the endpoint and model:

```env
WAKE_BASE_URL=http://127.0.0.1:8080/v1
WAKE_MODEL=your-model-name
WAKE_API_KEY=
```

Then run:

```bash
npm start
```

The default endpoint is a local llama.cpp-compatible server. For a remote provider, set its OpenAI-compatible base URL and keep any API key only in your local `.env` file. Never commit that file.

## CLI commands

- `/help` — show commands
- `/model` — show the current model
- `/model NAME` — switch model for the current session
- `/clear` — clear saved conversation history
- `/exit` — exit

Conversation history is stored locally in `.wake/sessions/` and is excluded from Git.

## Development

```bash
npm test
npm run check
```

## Project status

This is the initial CLI and model-gateway foundation, not yet an autonomous coding agent. Repository editing, diff approval, controlled command execution, GitHub workflows, and resumable cloud jobs are planned in [docs/ROADMAP.md](docs/ROADMAP.md).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/AGENT_RULES.md](docs/AGENT_RULES.md).

All infrastructure choices are being evaluated against the 0-VND target. Free-tier quotas and availability must be verified; always-on GPU inference is not assumed.
