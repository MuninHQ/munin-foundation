# Munin Current State

> Canonical operational snapshot. Update after meaningful execution.
>
> Last updated: 2026-08-17

## Current objective

Establish Munin as a persistent, model-agnostic execution environment that accepts objectives, coordinates specialist agents, and continues safe work across conversations and tools without repeated manual continuation prompts.

## Current phase

**Multi-agent orchestration / Control Room execution integration**

## Active architecture decision

Use a layered operating model:

`User objective → Munin Orchestrator → specialist agents → independent QA → durable state/memory → operational verification`

The repository, not any individual chat, remains the durable source of truth for execution state. Existing autonomous execution, engineering runtime, memory, Control Room state, provider routing, recovery, and observability components are reused rather than duplicated.

## Specialist model

- **Product & State Manager** — decomposes objectives, maintains executable backlog/state, and selects the next unblocked action.
- **Researcher** — gathers evidence and compares alternatives when uncertainty must be resolved.
- **Engineer** — implements through the bounded `PLAN → BUILD → TEST → VERIFY → FIX` loop.
- **QA & Verifier** — independently validates acceptance criteria and routes defects back to Engineer.
- **Memory Curator** — promotes durable decisions, constraints, evidence, and lessons into project continuity.
- **Operator** — verifies CI/runtime health and attempts safe operational recovery.

## Completed in this phase

- Control Room architecture and durable operational files established.
- Autonomous execution loop implemented.
- Human-blocker policy implemented.
- Provider-neutral executor handoff contract established.
- Multi-agent registry and supervisor core implemented on `agent/munin-multi-agent-orchestrator`.
- Automatic specialist routing implemented by work type.
- QA failure routing implemented as `QA → Engineer → QA` without a manual continuation prompt.
- Recoverable blocker retry implemented.
- Human-only blocker classification implemented for credentials, 2FA, financial commitments, irreversible high-impact actions, external permission, and unresolved strategic ambiguity.
- Agent contracts created for Orchestrator, Product/State, Researcher, Engineer, QA, Memory Curator, and Operator.
- Automated tests added for routing, recovery, QA repair loop, and human-blocker escalation.

## In progress

- CI validation of the multi-agent orchestration branch.
- Production adapters binding every specialist role to the appropriate existing Munin runtime.
- Canonical Control Room entrypoint that hydrates state, invokes the Orchestrator, and writes results back.

## Next executable work

1. Pass repository CI for the multi-agent orchestration increment and repair any failures.
2. Bind Engineer to `EngineeringAutonomousMission` and map the remaining specialists to existing state, research, memory, QA, and operations capabilities.
3. Expose the Orchestrator as the default objective-level Control Room execution entrypoint.
4. Persist orchestration traces and specialist evidence into canonical state/session memory.
5. Add end-to-end resume/write-back verification.

## Real blockers

None for repository-side implementation.

## Guardrails

- No automatic public publication without explicit approval.
- No material paid service dependency without explicit approval.
- Prefer zero-additional-cost tooling where viable.
- Preserve model/provider portability.
- Reversible technical decisions may proceed autonomously when consistent with accepted principles.
- While a safe, reversible, executable next action exists, the Orchestrator continues without requiring `cont`, `next`, or `build` from the user.
