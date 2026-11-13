# Wake AI

Wake AI is a responsive hybrid AI workspace: a chat-first web interface with a coding workspace planned as the next milestone. It is designed to grow into a development and management hub for the Wake Discord bot.

## Current status

- [x] Responsive Vietnamese-first web chat UI
- [x] Server-side OpenAI-compatible streaming gateway
- [x] Private password login with signed, HTTP-only sessions
- [x] Basic per-instance request throttling and safe provider error handling
- [x] Keeps the CLI available as an optional tool
- [ ] Persistent web conversations and user accounts
- [ ] GitHub repository browser and project indexing
- [ ] Code editor, proposed diffs and approval flow
- [ ] Isolated command runner and tests
- [ ] Bot management and deployment dashboard

This is an early private prototype, not yet a production-ready multi-user service.

## Requirements

- Node.js 22.12+
- npm
- An OpenAI-compatible chat-completions endpoint reachable from the server

## Local setup

```bash
git clone https://github.com/nhattruongnc23-lang/Wake-AI.git
cd Wake-AI
git switch feat/wake-vercel-hardening
npm install
cp .env.example .env
```

Set these values in `.env`:

```env
WAKE_BASE_URL=http://127.0.0.1:8080/v1
WAKE_MODEL=your-model-name
WAKE_API_KEY=
WAKE_ACCESS_PASSWORD=use-a-long-unique-password
WAKE_SESSION_SECRET=use-a-random-secret-at-least-32-characters-long
```

Never commit `.env` or share these values in chat. Generate a random session secret with a password manager or a cryptographically secure generator.

Start the website:

```bash
npm run dev
```

Open `http://localhost:3000`. For a production build use `npm run build` then `npm start`.

## Vercel deployment architecture

- Vercel hosts the Next.js website and its API routes.
- The model runs separately behind an OpenAI-compatible HTTPS endpoint.
- Configure `WAKE_BASE_URL`, `WAKE_MODEL`, `WAKE_API_KEY`, `WAKE_ACCESS_PASSWORD`, and `WAKE_SESSION_SECRET` as server-side Environment Variables in Vercel. Do not prefix secrets with `NEXT_PUBLIC_`.
- `WAKE_SESSION_SECRET` must contain at least 32 characters.
- `127.0.0.1` is not a remote model address on Vercel. Replace it with the model server's reachable endpoint.
- Keep deployment private until all environment variables are configured.

The included in-memory rate limiter is best-effort and may reset or operate separately across serverless instances. It is not a substitute for a shared rate-limit service or platform-level abuse protection.

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

Never let an agent execute arbitrary repository commands on the web server; future coding tasks must run in an isolated worker and require review before repository writes.

See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and `docs/AGENT_RULES.md`.
