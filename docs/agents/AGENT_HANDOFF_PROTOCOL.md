# Munin Agent Handoff Protocol

## Goal

Make Munin independent of the memory, availability or subscription state of any individual AI agent. Git and Munin durable state carry continuity; agents are replaceable operators.

## Applies to

ChatGPT, Manus, Claude, Hermes and future coding/research agents that operate on Munin.

## Canonical knowledge hierarchy

When sources disagree, use this order:

1. Current code and deterministic tests.
2. Accepted ADRs under `decisions/`.
3. `ops/CURRENT_STATE.md` and canonical operational state.
4. Product/architecture documentation.
5. Backlog/session records.
6. Agent-specific onboarding/handoff notes.
7. Conversation history.

Conversation memory must never be the only place a material project decision exists.

## Start-of-session protocol

Every agent taking engineering ownership should:

1. Verify repository/workspace and branch.
2. Inspect `git status`; preserve unknown local work.
3. Read `README.md`, `AGENTS.md`, `ops/CURRENT_STATE.md` and relevant ADR/product docs.
4. Inspect related code and tests before proposing changes.
5. Identify what is already implemented before adding anything.
6. Separate executable work from genuine human boundaries.
7. Continue safe reversible work without repeatedly asking for permission.

## During execution

- Prefer the smallest coherent change.
- Test before and after meaningful modifications when practical.
- Do not silently introduce paid services or new persistent external dependencies.
- Do not expose secrets/private data in Git, logs, prompts or handoffs.
- Record architecture decisions durably when they change system behavior.
- Preserve auditability and approval gates for consequential actions.

## End-of-task write-back

For a material change, update the relevant durable sources before declaring completion:

- code/tests;
- `ops/CURRENT_STATE.md` when operational truth changes;
- backlog/session record when applicable;
- ADR when architecture/governance changes;
- runbook when operating procedure changes;
- agent onboarding only when agent-specific recovery instructions change.

A handoff should state:

- objective;
- completed work;
- changed files/commits;
- tests/build verification;
- unresolved blockers;
- human actions required;
- safest next executable step.

## Human-boundary rule

Stop and ask only when execution requires something the agent cannot or must not do, such as credentials/2FA, explicit paid-service activation, irreversible consequential action, physical-device validation, or a product decision not covered by accepted principles.

A lack of conversational context is not itself a human boundary: reconstruct context from the repository first.

## Documentation-as-done rule

For material work, documentation is part of Definition of Done. An implementation that changes operational truth but leaves canonical state misleading is incomplete.

## Recovery after agent memory loss

If an agent loses its history:

1. Do not ask the user to reconstruct the project manually.
2. Rehydrate from Git and durable Munin state.
3. Produce a short recovery SITREP.
4. Continue from the highest-value safe executable task.

Agent-specific recovery files may exist under `docs/agents/`, but they supplement rather than replace the canonical project documents.
