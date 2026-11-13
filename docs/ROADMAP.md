# Roadmap

## Phase 1 — Web foundation
- [x] Next.js App Router foundation
- [x] Responsive chat-first hybrid interface
- [x] Server-side OpenAI-compatible streaming API
- [x] Reuse existing provider and configuration modules
- [x] Keep CLI as an optional interface
- [ ] Verify build and test on the target deployment runtime

## Phase 2 — Reliable chat
- [ ] User authentication and private access
- [ ] Persistent conversation storage
- [ ] Conversation list, rename and delete
- [ ] Provider diagnostics and model selection
- [ ] Rate limits and request cancellation

## Phase 3 — Repository workspace
- [ ] GitHub OAuth with minimum permissions
- [ ] Repository picker and branch selector
- [ ] File tree and source viewer
- [ ] Repository indexing and project-specific memory
- [ ] Patch proposals and diff approval

## Phase 4 — Coding agent
- [ ] Isolated execution worker
- [ ] Bounded command and test runner
- [ ] Debug loop with checkpoints
- [ ] Feature branch, commit and pull request
- [ ] Never modify main directly

## Phase 5 — Wake Bot Manager
- [ ] Bot instance dashboard
- [ ] Runtime status and logs
- [ ] Controlled deployment and restart integrations
- [ ] Resource monitoring where hosting provider exposes metrics

## Constraints
The project targets a 0-VND setup. Free service limits and availability must be verified. No always-on GPU, unlimited storage, or 24/7 execution is assumed. Keep the app private until authentication and abuse protection are ready.
