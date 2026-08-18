# Munin Current State

> Canonical operational snapshot. Update after meaningful execution.
>
> Last updated: 2026-08-17

## Current objective

Establish Munin as a persistent, model-agnostic execution environment that can continue work across conversations and tools without requiring repeated manual reconstruction of context.

## Current phase

**Control Room foundation / autonomous execution preparation**

## Active architecture decision

Use a layered operating model:

`ChatGPT Project / Control Room → durable repo state → Codex or other executor → GitHub verification and history`

The repository, not any individual chat, is the durable source of truth for execution state.

## Completed in this phase

- Architecture direction accepted by executive owner.
- Control Room concept defined.
- Canonical commands defined: `BUILD`, `CONT`, `SITREP`, `NEXT`.
- Autonomous execution loop defined: `PLAN → BUILD → TEST → VERIFY → FIX`.
- Human-blocker policy defined.
- Daily Munin progress/blocker review automation enabled in ChatGPT.

## In progress

- Durable operational state files.
- Consolidation of the existing backlog into a canonical repo-backed backlog.
- Integration of the Control Room protocol with the existing Munin v0.1 roadmap.

## Next executable work

1. Consolidate backlog items from current Munin work into `ops/BACKLOG.md`.
2. Add session/event logging contract.
3. Add accepted decision record for the Control Room architecture.
4. Update portfolio documentation to remove provider-specific ownership assumptions where appropriate.
5. Define executor handoff contract for Codex/Claude/local agents.
6. Implement autonomous execution harness incrementally.

## Real blockers

None for repository-side documentation and architecture work.

## Guardrails

- No automatic public publication without explicit approval.
- No material paid service dependency without explicit approval.
- Prefer zero-additional-cost tooling where viable.
- Preserve model/provider portability.
- Reversible technical decisions may proceed autonomously when consistent with accepted principles.
