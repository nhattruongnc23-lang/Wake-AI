# Roadmap

## Phase 1 — Terminal foundation
- [x] Node.js CLI shell
- [x] OpenAI-compatible streaming model gateway
- [x] Local conversation history
- [x] Basic configuration and tests
- [ ] Verify Gboard/Vietnamese input behavior on Termux

## Phase 2 — Model connectivity
- [ ] Test against a local llama.cpp server
- [ ] Add provider connection diagnostics
- [ ] Evaluate free hosted inference options without assuming permanent availability
- [ ] Add model capability metadata and context limits

## Phase 3 — Repository assistant
- [ ] Connect a selected GitHub repository
- [ ] Build a repository file map
- [ ] Search and read source files
- [ ] Generate proposed patches and show diffs
- [ ] Require approval before writing changes

## Phase 4 — Coding agent
- [ ] Add a controlled command runner
- [ ] Add test/debug loops with execution limits
- [ ] Create feature branches and pull requests
- [ ] Save project-specific memory and resumable task state

## Phase 5 — Cloud workers
- [ ] Evaluate free-tier worker options and their quotas
- [ ] Run short-lived jobs on demand
- [ ] Resume jobs from saved checkpoints
- [ ] Keep the CLI usable when a cloud worker is offline

## Constraints
The project targets a 0-VND setup. Free services can change limits or availability. No always-on GPU, unlimited storage, or 24/7 execution is assumed until it has been verified.
