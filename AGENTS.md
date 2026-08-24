# Munin Agent Context

This repository is the canonical Munin Foundation workspace. External coding agents, including Hermes Agent, must treat the rules below as project-level operating constraints.

## Mission

Improve Munin as a local-first personal intelligence and operations system without introducing mandatory paid inference, vendor lock-in, or unnecessary duplication of existing capabilities.

## Non-negotiable constraints

- Preserve local-first and zero-mandatory-cost operation.
- Never require a paid API, subscription, or cloud inference path for core functionality.
- Prefer existing Munin abstractions before adding a new framework or dependency.
- Do not weaken action safety, approval gates, auditability, or durable state handling.
- Never commit secrets, OAuth credentials, tokens, local `.env` files, runtime state, or private user data.
- Keep Windows support first-class; WSL may be optional but must not become mandatory for Munin itself.
- Do not silently replace Ollama, deterministic-local, Manus bridge, Host Worker, or existing orchestration paths.
- New agent runtimes must be optional adapters and must fail closed.

## Architecture orientation

Before changing agent behavior, inspect these seams first:

- `src/agent-orchestrator.ts`
- `src/agent-runtime-adapters.ts`
- `src/orchestration-runtime-core.ts`
- `src/provider-policy.ts`
- `src/autonomous-execution-loop.ts`
- `src/assistant-memory.ts`
- `src/control-room-state.ts`

For operational state, prefer the canonical Control Room state and durable session log rather than inventing parallel memory stores.

## Implementation discipline

1. Read the relevant implementation and tests before editing.
2. Make the smallest coherent change that produces a measurable capability gain.
3. Add or update tests for behavior changes.
4. Run `npm test` before declaring completion.
5. Report changed files, test results, remaining blockers, and any new human setup required.
6. Do not claim a local machine installation or runtime validation unless it was actually performed.

## Hermes-specific use

Hermes is most valuable to Munin as an optional engineering/research operator with reusable skills and persistent procedural learning. It should augment Munin rather than become Munin's required inference engine.

When Hermes operates in this repository:

- Prefer isolated worktrees for autonomous code changes.
- Use project rules and Munin skills before generic autonomous behavior.
- Keep dangerous-command approval enabled; do not use `--yolo` for Munin work.
- Treat generated skills as proposals until they are deterministic, scoped, reviewable, and free of secrets.
- Store reusable Munin procedures under `skills/` only when they are broadly repeatable.

## Definition of done

A change is done only when the repository builds, tests pass, the behavior is auditable, and the change does not add a mandatory paid dependency.
