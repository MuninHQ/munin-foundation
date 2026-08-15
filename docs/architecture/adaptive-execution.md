# Adaptive Execution Layer

## Status

Core implementation, user-facing `EXECUTE` integration, SITREP visibility, and first outcome-informed routing for issue #110.

## Purpose

Munin needs an execution loop that can route tasks, retrieve relevant prior outcomes, execute through a small set of roles, validate independently, and record lessons for future work.

This design is inspired by patterns seen in Ruflo, but Ruflo is **not** a runtime dependency. The implementation remains native to Munin, local-first, and compatible with the existing zero-cost provider policy.

## Execution loop

`Task → Context/Outcome retrieval → Role route → Learned orchestration policy → Execute → Validate → Outcome → Lesson → Memory`

## Roles

- **Orchestrator** — coordinates general, strategic, or high-risk work.
- **Researcher** — handles discovery and evidence gathering.
- **Builder** — handles implementation/refactoring tasks.
- **Reviewer** — independently validates completion criteria.

The initial implementation intentionally limits role count. Agent proliferation is out of scope for v0.1.

## Routing

`TaskRouter` accepts an explicit task kind when available and otherwise uses deterministic intent inference. Build work routes to Builder + Reviewer; research routes to Researcher + Reviewer; review work routes directly to Reviewer; strategy/high-risk work routes through Orchestrator + Reviewer.

This layer complements the existing `IntelligenceOrchestrationPlanner`: provider/council selection remains a separate concern from execution-role routing.

Before orchestration planning, Munin retrieves up to five relevant prior outcomes and derives a bounded learning signal:

- two or more relevant direct failures escalate a later low/medium-risk task to Council;
- two or more validated direct outcomes with no relevant direct failure may keep the direct route;
- repeated validated Council outcomes may reuse Council when there is no competing direct-success evidence;
- insufficient evidence leaves the planner in `auto` mode.

Learning never overrides high-risk, strategy, or review policy. Those tasks remain governed by the authoritative risk/orchestration rules. Learned routing also cannot change `localOnly=true`, `maxCostPerCall=0`, or the allowed local provider preference.

## Reviewer gate

A task cannot return a successful `ExecuteResult` when validation fails. Failed validation is recorded as an outcome first, then the engine raises an error identifying failed checks. This prevents false-success completion while preserving the failure as future learning evidence.

The user-facing `munin execute <action-id> <outcome>` path now passes through this gate before an action is marked `done`. Successful execution records its route, validation result, prior-outcome count, and adaptive outcome ID in the normal Munin event stream.

## Outcome memory

`OutcomeStore` is an interface with two adapters:

- `InMemoryOutcomeStore` for deterministic tests and isolated execution.
- `JsonOutcomeStore` for runtime persistence using Munin's existing crash-safe atomic JSON storage.

`AdaptiveExecutionEngine` defaults to the persistent JSON adapter under the configured runtime data directory. The store retains the 500 most recent records and retrieves up to five relevant prior outcomes for each task.

Each outcome records:

- task and capability;
- execution-role route;
- orchestration plan (`direct`/`council`, provider preference, zero-cost policy);
- passed/failed status;
- evidence;
- lesson;
- tags;
- timestamp.

Relevant prior outcomes are retrieved before orchestration planning and execution. This creates a bounded outcome-learning loop without a vector database or paid infrastructure.

## SITREP visibility

SITREP reads adaptive metadata from recent `action.executed` events and exposes a dedicated `Adaptive execution` section. For each execution it shows whether reviewer validation passed, the execution-role route, and the persistent outcome-memory identifier.

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
- Outcome learning cannot weaken risk/review controls.
- Every extension must map to a Munin v0.1 use case.

## Next increment

1. Add explicit failure categories and reviewer feedback to improve learning quality.
2. Track actual provider execution outcomes (Ollama vs deterministic fallback) before allowing provider-order learning.
3. Add recency/decay so old failures do not permanently dominate route selection.
