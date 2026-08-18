# Munin Canonical Backlog

> Repo-backed execution queue for Munin. Priorities are P0 highest to P3 lowest.
>
> Last updated: 2026-08-17

## P0 — Execution foundation

- [x] **Munin Control Room Protocol** — make repo state the durable source of truth across ChatGPT, Codex, Claude, local agents, and future providers.
- [x] **Autonomous Execution Harness** — implement `PLAN → BUILD → TEST → VERIFY → FIX`, repeating until acceptance criteria are met or a real human blocker exists.
- [x] **Multi-agent Orchestrator** — route objectives across Product/State, Researcher, Engineer, QA, Memory Curator, and Operator; recover automatically when a safe next action exists.
- [x] **State hydration** — any new execution session reads canonical state before acting.
- [x] **State write-back** — meaningful progress updates current state, backlog, session log, and decision records.
- [x] **Real-blocker classifier** — distinguish human-only blockers from issues the system can diagnose, retry, infer, or safely decide.
- [x] **Executor handoff contract** — standard task package for ChatGPT/Codex/Claude/local models including goal, constraints, files, acceptance criteria, verification, and write-back requirements.
- [ ] **Default specialist executor adapters** — bind every multi-agent role to its production runtime implementation instead of test/injected executors only.
- [ ] **Orchestrator Control Room entrypoint** — expose one canonical objective command/API that hydrates state, invokes the multi-agent supervisor, and writes back results.
- [ ] **Browser automation evaluation** — evaluate and, if suitable, integrate Playwright CLI/MCP for browser automation and end-to-end verification.
- [ ] **Engineering skills evaluation** — assess reusable engineering skills/patterns inspired by Superpowers and comparable harnesses while remaining model-agnostic.
- [ ] **DeepSeek Harness evaluation** — extract useful orchestration, verification, and execution patterns without creating provider lock-in.

## P0 — Context continuity

- [x] **Canonical project memory foundation** — persist core Munin execution state, decisions, and session events outside individual chats.
- [ ] **Conversation ingestion path** — define a safe way to import relevant historical conversations/exports into structured project knowledge.
- [ ] **Context relevance policy** — separate durable Munin knowledge from unrelated personal/local conversational memory.
- [x] **Session log** — append concise execution events so a new session can reconstruct what happened without replaying every chat.

## P1 — Munin v0.1

- [ ] Project portfolio dashboard.
- [ ] Persistent context and memory model.
- [ ] `SITREP`, `BUILD`, `CONT`, `NEXT`, and `EXECUTE` workflows.
- [ ] Career operations center.
- [ ] Repository state visibility.
- [ ] Accepted Munin v0.1 product specification and implementation plan.

## P1 — Integrations and operator experience

- [ ] Mobile-first Control Room experience.
- [ ] GitHub/Codex execution path with status visibility.
- [ ] Zero-additional-cost local model fallback through Ollama where appropriate.
- [ ] LinkedIn Content Intelligence / Publisher: analyze previous posts, images, identity, reliable public sources, generate recommendations, and preserve explicit publication approval.
- [ ] Remote access/runbook consolidation for the local Munin environment.

## P1 — Architecture and research

- [ ] Consolidate AIP RFC/SPEC/BUILD/ADR backlog and map components to Munin v0.1.
- [x] Establish the initial multi-agent pattern only where roles have explicit responsibilities, independent QA, and durable-state write-back.
- [ ] Continue GitHub ecosystem scan for reusable open-source components, replacing weaker backlog candidates when materially better options are found.

## P2 — Hardening

- [ ] End-to-end acceptance tests for canonical workflows.
- [ ] Failure recovery and idempotent resume behavior.
- [ ] Cost guardrails and provider routing policy.
- [ ] Security/privacy review for context ingestion and external connectors.
- [ ] Observability for execution attempts, retries, blockers, and outcomes.

## Done in current phase

- [x] Architecture direction accepted: Project/Control Room + durable repo state + executor + GitHub history.
- [x] Control Room command semantics drafted.
- [x] Autonomous loop and human-blocker policy implemented.
- [x] Multi-agent Orchestrator core and specialist contracts implemented.
- [x] Daily Munin progress/blocker review automation created in ChatGPT.
