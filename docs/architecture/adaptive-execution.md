# Adaptive Execution Layer

## Status

Initial implementation for issue #110.

## Purpose

Munin needs an execution loop that can route tasks, retrieve relevant prior outcomes, execute through a small set of roles, validate independently, and record lessons for future work.

This design is inspired by patterns seen in Ruflo, but Ruflo is **not** a runtime dependency. The implementation remains native to Munin, local-first, and compatible with the existing zero-cost provider policy.

## Execution loop

`Task → Context/Outcome retrieval → Route → Execute → Validate → Outcome → Lesson → Memory`

## Roles

- **Orchestrator** — coordinates general, strategic, or high-risk work.
- **Researcher** — handles discovery and evidence gathering.
- **Builder** — handles implementation/refactoring tasks.
- **Reviewer** — independently validates completion criteria.

The initial implementation intentionally limits role count. Agent proliferation is out of scope for v0.1.

## Routing

`TaskRouter` accepts an explicit task kind when available and otherwise uses deterministic intent inference. Build work routes to Builder + Reviewer; research routes to Researcher + Reviewer; review work routes directly to Reviewer; strategy/high-risk work routes through Orchestrator + Reviewer.

This layer complements the existing `IntelligenceOrchestrationPlanner`: provider/council selection remains a separate concern from execution-role routing.

## Reviewer gate

A task cannot return a successful `ExecuteResult` when validation fails. Failed validation is recorded as an outcome first, then the engine raises an error identifying failed checks. This prevents false-success completion while preserving the failure as future learning evidence.

## Outcome memory

`OutcomeStore` is an interface with two adapters:

- `InMemoryOutcomeStore` for deterministic tests and isolated execution.
- `JsonOutcomeStore` for runtime persistence using Munin's existing crash-safe atomic JSON storage.

`AdaptiveExecutionEngine` defaults to the persistent JSON adapter at `data/runtime/adaptive-outcomes.json` (or the configured `MUNIN_DATA_DIR`). The store retains the 500 most recent records and retrieves up to five relevant prior outcomes for each task.

Each outcome records:

- task and capability;
- route;
- passed/failed status;
- evidence;
- lesson;
- tags;
- timestamp.

Relevant prior outcomes are retrieved before execution and provided to the runner. This creates a simple outcome-learning loop without a vector database or paid infrastructure.

## Lifecycle hooks

Supported events:

1. `session:start`
2. `task:pre`
3. `validation:pre`
4. `validation:post`
5. `task:post`
6. `session:end`

Hooks are sequential and deterministic by design.

## Guardrails

- No paid infrastructure.
- No wholesale Ruflo dependency.
- No autonomous publication or irreversible external action.
- Sensitive/private information must not be committed to the public repository.
- Every extension must map to a Munin v0.1 use case.

## Next increment

1. Connect Adaptive Execution to the user-facing `EXECUTE` command/API surface.
2. Bridge task routing with existing provider/council orchestration without merging their responsibilities.
3. Expose execution/outcome evidence to SITREP.
