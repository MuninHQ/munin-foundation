# Munin Agent Context

This is the canonical Munin Foundation workspace: a local-first personal intelligence and operations system.

## Non-negotiable constraints

- Preserve local-first and zero-mandatory-cost operation; core behavior must not require paid inference, subscriptions, or cloud services.
- Prefer existing Munin abstractions and preserve Provider Registry authority, approvals, auditability, durable state, and provider portability.
- Never commit secrets, credentials, `.env` files, runtime state, or private user data.
- Keep Windows support first-class. WSL may be optional, never mandatory.
- Do not silently replace deterministic-local, Ollama, Manus, Host Worker, or existing orchestration paths. Optional runtimes fail closed.
- Consequential external actions require the existing explicit approval boundary.

## Architecture entry points

Before changing agent behavior inspect `src/agent-orchestrator.ts`, `src/agent-runtime-adapters.ts`, `src/orchestration-runtime-core.ts`, `src/provider-policy.ts`, `src/autonomous-execution-loop.ts`, `src/assistant-memory.ts`, and `src/control-room-state.ts`.

Use canonical Control Room state and the durable session log instead of parallel memory stores. For context selection, output caps, model routing, Build State, diff-first review, lazy capabilities, and metrics follow `docs/engineering/CONTEXT_EFFICIENCY.md`. For manual Web handoffs follow `docs/engineering/CODEX_WEB_ZERO_RISK.md`.

## Second Brain protocol

For substantive implementation, debugging, research, architecture, or continuation work, run after the repository is available and before editing:

`npm run second-brain:recall -- --task "<short task>" --project "<project>"`

Use returned evidence without exposing private context. If the command itself is being repaired, use existing Control Room state and commit memory when restored.

After validation and before handoff run:

`npm run second-brain:commit -- --task "<short task>" --summary "<outcome>" --project "<project>" --decisions "<d1>|<d2>" --changed "<c1>|<c2>" --next "<n1>|<n2>" --failed "<f1>|<f2>"`

Store only durable outcomes, decisions, meaningful changes, failures worth avoiding, and next actions. Never store secrets or raw credentials.

## Engineering loop

Use `inspect → assumptions → observable success → smallest coherent plan → edit → focused validation → broad validation → diff review → repair → write-back → handoff`.

- Read relevant implementation and tests before editing.
- Prefer Git, `rg`, TypeScript, project scripts, and tests before model inference.
- Keep diffs scoped and preserve unrelated changes.
- Add tests for behavior changes; diagnose failures from evidence.
- Run focused checks, then `npm test` before completion when execution is available.
- Review the final diff; a green suite is necessary but not sufficient.
- Continue through safe reversible actions until completion or a genuine human boundary.

## UI governance

Before UI work read `docs/design/DESIGN.md`, `design/tokens.json`, and `docs/design/AGENT_CONTRACT.md`. Reuse existing patterns and semantic tokens. Design drift remains observation-only; run `node scripts/design-drift-checker.mjs design/drift.config.json` and report findings without mass-restyling or automatic promotion.

## Completion gate

Completion requires evidence that the requested behavior exists in the intended seam; focused and broad validation pass; the diff has no unrelated refactor, hidden dependency, runtime data, or secret; approval, cost, privacy, audit, Windows, and local-first constraints remain intact; repository state is reported accurately; and any remaining blocker genuinely requires a user-only action.

Never claim an unexecuted test, build, installation, restart, or runtime smoke check succeeded.
