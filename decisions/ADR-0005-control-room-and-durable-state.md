# ADR-0005 — Control Room and Durable Repository State

- **Status:** Accepted
- **Date:** 2026-08-17

## Context

Munin work has been distributed across multiple conversations and tools. This creates unnecessary operator overhead: the user repeatedly reopens chats, reconstructs context, asks execution to continue, and must determine whether an apparent blocker is actually human-dependent.

The project already values continuity, portability, context, and user autonomy. A temporary conversation should therefore not be the sole operational memory for ongoing work.

## Decision

Munin will use a **Control Room** operating model with **durable repository-backed state**.

The canonical flow is:

`User intent → Control Room → durable state → executor → tests/verification → durable write-back`

The Control Room may run in ChatGPT or another compatible orchestration environment. Engineering execution may be performed by Codex, Claude, local models, or future providers. Providers are implementation details rather than architectural dependencies.

The default autonomous execution loop is:

`PLAN → BUILD → TEST → VERIFY → FIX → repeat`

Routine reversible implementation decisions should proceed without repeated user confirmation. Execution stops for the user only when a genuine human-only blocker, material spend, public publication approval, irreversible action, or strategically ambiguous decision is encountered.

## Canonical operational files

- `ops/CURRENT_STATE.md`
- `ops/BACKLOG.md`
- `ops/SESSION_LOG.md`
- `docs/product/control-room.md`
- accepted ADRs, RFCs, and specifications

## Consequences

### Positive

- New conversations and executors can resume from durable state.
- The user does not need to repeatedly say `CONT` after recoverable issues.
- Git history becomes an auditable record of project evolution.
- Munin remains model/provider agnostic.
- Autonomous engineering patterns can be implemented incrementally and tested against real Munin work.

### Trade-offs

- Durable state must be kept current.
- Agents need explicit read-before-act and write-back contracts.
- Automation must be constrained by security, publication, spend, and irreversible-action guardrails.

## Rejected alternatives

### Conversation history as primary state

Rejected because temporary chat context is not sufficiently durable, portable, or auditable.

### Provider-specific agent architecture

Rejected because Munin should not depend structurally on Claude, ChatGPT, Codex, or any single model vendor.

### Human confirmation after every step

Rejected because it creates unnecessary operator friction and conflicts with the goal of autonomous execution under explicit guardrails.
