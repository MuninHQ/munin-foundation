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

## Engineering loop

For implementation work, use this loop unless a narrower repository procedure overrides it:

`inspect → state assumptions → define observable success → plan the smallest coherent change → edit → focused validation → broad validation → inspect diff → repair/retry → write back → handoff`

The loop is evidence-bound:

- Read the relevant implementation and tests before editing.
- State material assumptions when they affect behavior, architecture, data, safety, cost or compatibility.
- Translate the request into observable success criteria before changing code.
- Prefer the simplest change that satisfies the objective. Avoid speculative features, premature abstractions and configurability that was not requested.
- Keep the diff surgical. Every changed line must trace to the objective or to validation required by the objective.
- Preserve unrelated code, comments, formatting and behavior. Record unrelated issues instead of silently expanding scope.
- Add or update tests for behavior changes.
- Run focused validation first, then the relevant broader build and tests.
- Diagnose failures from evidence; do not hide, waive or reinterpret a failing validation to claim success.
- Review the final diff after tests pass. A green suite is necessary but not sufficient.
- Prefer reversible execution and continue autonomously until completion or a genuine human boundary.

## Completion gate

Do not declare a change complete from confidence language alone. Completion requires evidence for all applicable items:

1. **Objective** — the requested behavior is explicitly satisfied.
2. **Implementation** — the smallest coherent implementation exists in the intended architecture seam.
3. **Validation** — focused tests plus the relevant broader build/test suite pass.
4. **Diff integrity** — no unrelated refactor, formatting churn, dead code, hidden dependency or speculative feature was introduced.
5. **Safety/cost** — approvals, secret handling, auditability, local-first behavior and zero-mandatory-cost constraints remain intact.
6. **Repository state** — branch/commit/PR state is known and reported accurately.
7. **Human boundary** — any remaining blocker genuinely requires an external credential, irreversible approval, inaccessible machine/device or other user-only action.

When a check cannot be executed in the current environment, say exactly which evidence is missing. Never represent an unexecuted test, build, install or runtime validation as completed.

## Implementation discipline

1. Read the relevant implementation and tests before editing.
2. Make the smallest coherent change that produces a measurable capability gain.
3. Add or update tests for behavior changes.
4. Run `npm test` before declaring completion when the environment allows repository execution.
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

A change is done only when the repository builds, tests pass, the requested behavior is verified against observable criteria, the final diff has been reviewed, the behavior is auditable, and the change does not add a mandatory paid dependency.
