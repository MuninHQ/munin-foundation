# Munin v0.1 Product Specification

## Product thesis
Munin is a contextual operating system that preserves state across sessions and turns context into decisions, actions, and updated memory.

## Initial user
The initial user is a senior professional managing career transition, projects, research, content, and personal priorities across multiple tools.

## Jobs to be done
1. Understand what materially changed since the previous review.
2. Identify the highest-priority decision or action.
3. Execute work without reconstructing context manually.
4. Preserve the result as structured state and auditable events.
5. Inspect, correct, export, or delete stored context.

## v0.1 scenarios
- Generate a portfolio SITREP from structured project and action state.
- Add and update projects, decisions, and actions.
- Execute an action and record its outcome.
- Inspect the complete local context store.
- Re-run SITREP and observe the changed state.

## Functional requirements
- Local JSON/JSONL persistence.
- Deterministic SITREP generation from structured state.
- Event log for all mutations.
- CLI commands for SITREP, inspection, project listing, decisions, actions, and execution.
- Human-readable output and machine-readable data.

## Trust model
- Local-first by default.
- Source and timestamp on mutable records.
- No silent deletion or mutation.
- Context can be inspected and exported.
- Inferences must be distinguishable from confirmed facts.
- Sensitive career data must not be committed to the public repository.

## Out of scope
- Voice and avatar interfaces.
- Autonomous email or calendar writes.
- Vector databases.
- Multi-agent orchestration.
- Mobile application.
- Background automation.

## Acceptance criteria
1. `munin sitrep` produces priorities, changes, blockers, decisions, and next actions.
2. `munin decision add` creates a decision and event.
3. `munin action add` creates an actionable item.
4. `munin execute <id>` marks an action complete, records an outcome, and emits an event.
5. A second SITREP reflects the execution without manual context reconstruction.
6. Automated tests cover the state transition and SITREP output.

## Success metric
A weekly operating review can be completed from Munin state in under ten minutes without manually rebuilding project context.

## Kill criteria
Pause or narrow the product if four weekly cycles do not reduce context reconstruction, improve follow-up reliability, or produce clearer decisions.