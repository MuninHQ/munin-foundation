# Munin Current State

> Canonical operational snapshot. Update after meaningful execution.
>
> Last updated: 2026-08-17

## Current objective

Establish Munin as a persistent, model-agnostic execution environment that accepts objectives, coordinates specialist agents, and continues safe work across conversations and tools without repeated manual continuation prompts.

## Current phase

**Multi-agent orchestration / Control Room surface integration**

## Active architecture decision

Use a layered operating model:

`User objective → Munin Orchestrator → specialist agents → independent QA → durable state/memory → operational verification`

The repository, not any individual chat, remains the durable source of truth for execution state. Existing autonomous execution, engineering runtime, memory, Control Room state, provider routing, recovery, and observability components are reused rather than duplicated.

## Specialist model

- **Product & State Manager** — hydrates canonical state and establishes executable context.
- **Researcher** — uses the zero-additional-cost local orchestration runtime for evidence gathering when required.
- **Engineer** — executes through `EngineeringAutonomousMission` and the bounded `PLAN → BUILD → TEST → VERIFY → FIX` loop.
- **QA & Verifier** — independently gates engineering completion on durable evidence and routes defects back to Engineer.
- **Memory Curator** — appends durable orchestration outcomes and evidence to the canonical session log.
- **Operator** — checks the completed trace for unresolved execution issues before operational handoff.

## Completed in this phase

- Control Room architecture and durable operational files established.
- Autonomous execution loop and human-blocker policy implemented.
- Multi-agent registry, supervisor core, specialist contracts, routing, recovery, and QA repair loop implemented.
- Production specialist adapters implemented for state, research, engineering, QA, memory, and operations.
- Canonical `MuninControlRoomOrchestrator` entrypoint implemented with automatic state hydration.
- CLI objective surface implemented as `munin orchestrate <objective>`.
- Automated tests exist for routing, recovery, QA repair loop, and human-blocker escalation.

## In progress

- Independent build/test validation of the expanded orchestration branch.
- API/mobile exposure of the same canonical objective runtime.
- End-to-end orchestration trace/resume verification.

## Next executable work

1. Expose the canonical orchestrator through the API used by the mobile Control Room.
2. Add focused tests for production adapters and Control Room entrypoint.
3. Validate build/test and repair any type/runtime failures.
4. Add end-to-end resume/write-back verification.
5. Merge the orchestration increment only after verification evidence is available.

## Real blockers

None for repository-side implementation. Full local validation still requires an execution environment with repository dependencies available.

## Guardrails

- No automatic public publication without explicit approval.
- No material paid service dependency without explicit approval.
- Prefer zero-additional-cost tooling where viable.
- Preserve model/provider portability.
- Reversible technical decisions may proceed autonomously when consistent with accepted principles.
- While a safe, reversible, executable next action exists, the Orchestrator continues without requiring `cont`, `next`, or `build` from the user.
