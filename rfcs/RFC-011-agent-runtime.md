# RFC-011 — Agent Runtime and Execution Engine

## Status

Implemented for M9.1.

## Objective

Transform Munin objectives into auditable execution plans composed of agent-owned tasks with explicit dependencies, lifecycle states, results and telemetry.

## Runtime contract

An execution plan contains:

- one objective identifier;
- the original objective;
- plan status;
- ordered tasks;
- timestamps.

Each task declares:

- capability;
- owning agent;
- priority;
- dependencies;
- expected output;
- lifecycle timestamps;
- result or error.

## Lifecycle

Supported states are:

- `READY`;
- `RUNNING`;
- `WAITING`;
- `BLOCKED`;
- `FAILED`;
- `DONE`.

Tasks become executable only when every declared dependency is complete.

## Agent registry

M9.1 includes a deterministic local registry for planner, research, writing, career, Git and review capabilities. Unknown capabilities are assigned to the reviewer as a safe fallback.

## Planner

The initial planner uses transparent workflow templates inferred from the objective. It does not call an external model and does not claim autonomous reasoning. This keeps plans reproducible and auditable while the runtime contract stabilizes.

## Execution

The local executor simulates completion through deterministic result records. It establishes scheduling, persistence and observability without granting agents external side effects. Future increments may register real adapters behind the same task contract.

## Persistence

Execution plans are stored separately in `executions.json` under the configured Munin data directory. Existing state files remain backward compatible.

## Telemetry

The runtime reports plan and task counts, completed, failed and blocked tasks, average recorded duration and task distribution by agent.

## CLI

```text
munin runtime plan <objective>
munin runtime run <plan-id>
munin runtime list
munin runtime agents
munin runtime telemetry
```

## Non-goals

M9.1 does not:

- invoke external AI providers;
- execute GitHub writes automatically;
- schedule background jobs;
- approve its own high-risk actions;
- hide task decomposition or ranking logic.

## Acceptance criteria

- Objectives produce dependency-aware plans.
- Capabilities route to declared agents.
- Plans persist across process runs.
- Execution respects dependencies.
- Every completed task records timestamps and a result.
- Telemetry is deterministic from persisted plans.
- Existing Munin modules and tests remain operational.
