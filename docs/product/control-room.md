# Munin Control Room

## Purpose

The Control Room is the canonical orchestration layer for Munin work across ChatGPT, Codex, GitHub, local tooling, and future model providers.

Its purpose is to prevent project execution from depending on a single temporary conversation. The repository holds durable state; conversational agents consume and update that state.

## Operating model

`User intent → Control Room → state read → priority selection → execution → verification → state write-back`

The Control Room must always begin by reading the current project state and must end by updating durable state when meaningful progress, decisions, or blockers occur.

## Canonical commands

### BUILD

Take the highest-priority eligible backlog item and execute it as far as possible.

Expected behavior:

1. Read current state and backlog.
2. Select the highest-priority unblocked item.
3. Plan only as much as needed to execute safely.
4. Build.
5. Test.
6. Verify against acceptance criteria.
7. Fix failures and repeat.
8. Update state, backlog, and decision records.
9. Continue to the next eligible item unless a real human blocker exists.

### CONT

Resume from the last durable state without asking the user to reconstruct context.

### SITREP

Return a compact operational report containing:

- current objective;
- completed work;
- work in progress;
- next executable item;
- real blockers only;
- decisions that require the executive owner.

### NEXT

Select and start the next highest-priority eligible item.

## Autonomous execution loop

The default engineering loop is:

`PLAN → BUILD → TEST → VERIFY → FIX → repeat`

The loop ends only when one of these conditions is true:

- acceptance criteria are met;
- there is no eligible remaining work in scope;
- a real human-only blocker exists;
- continuing would violate a safety, security, cost, or irreversible-decision guardrail.

## What is not a blocker

The system must not stop merely because:

- another implementation path exists;
- a non-critical preference is unspecified;
- a test can be run automatically;
- a file can be inspected automatically;
- documentation can be inferred from accepted architecture;
- an error can reasonably be diagnosed and retried;
- a reversible technical choice can be made using existing principles.

## Real human blockers

Examples include:

- credentials or MFA that are not available to the execution environment;
- explicit financial commitment;
- publication to a public audience when approval is required;
- legal acceptance or binding agreement;
- destructive or irreversible action outside accepted policy;
- product or architectural decisions with materially different strategic outcomes and no existing decision rule.

## State contract

The Control Room treats these files as durable operational memory:

- `ops/CURRENT_STATE.md`
- `ops/BACKLOG.md`
- `ops/SESSION_LOG.md`
- `decisions/` for accepted durable decisions
- relevant RFCs/specifications under `rfcs/` and `docs/`

Conversation history is useful context, but it is never the sole source of truth for project state.

## Model independence

The Control Room is deliberately model-agnostic. ChatGPT, Codex, Claude, local models, or future providers may act as planners or executors as long as they respect the same state contract, guardrails, and verification loop.

## Human role

André remains executive owner for product direction, prioritization overrides, public publication, material spend, and irreversible strategic decisions. Routine execution should not require repeated confirmation.
