# Wake AI

Wake AI is a responsive hybrid AI workspace: a chat-first web interface with a coding workspace planned as the next milestone. It is designed to grow into a development and management hub for the Wake Discord bot.

## Current status

- [x] Responsive Vietnamese-first web chat UI
- [x] Server-side OpenAI-compatible streaming gateway
- [x] Reuses the existing model provider and environment configuration
- [x] Keeps the CLI available as an optional tool
- [ ] Persistent web conversations and user accounts
- [ ] GitHub repository browser and project indexing
- [ ] Code editor, proposed diffs and approval flow
- [ ] Isolated command runner and tests
- [ ] Bot management and deployment dashboard

This is an early web foundation, not yet an autonomous coding agent or a production-ready public service.

## Requirements

- Node.js 22.12+
- npm
- An OpenAI-compatible chat-completions endpoint reachable from the server

## Setup

```bash
git clone https://github.com/nhattruongnc23-lang/Wake-AI.git
cd Wake-AI
git switch feat/wake-web-foundation
npm install
cp .env.example .env
```

Edit `.env` on the server:

```env
WAKE_BASE_URL=http://127.0.0.1:8080/v1
WAKE_MODEL=your-model-name
WAKE_API_KEY=
```

Start the website:

```bash
npm run dev
```

Open `http://localhost:3000`. For a production build use `npm run build` then `npm start`.

The default model URL is suitable only when a compatible model server runs on the same machine. When deployed elsewhere, configure a reachable model endpoint. API keys stay on the server and are never sent to the browser.

## Optional CLI

The original terminal client remains available:

```bash
npm run cli
```

## Validation

```bash
npm test
npm run check
npm run build
```

## Security and deployment

This prototype does not yet include user authentication, persistent multi-user storage, or robust rate limiting. Keep it local or behind a trusted private access layer. Do not publish it as an open endpoint until authentication, abuse protection, and deployment secrets are configured.

Never commit `.env`, model API keys, GitHub tokens, or conversation data. Never let an agent execute arbitrary repository commands on the web server; future coding tasks must run in an isolated worker and require review before repository writes.

See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and `docs/AGENT_RULES.md`.
