# Goal Engine

## Purpose

The Goal Engine operationalizes accepted objectives. It does not replace North Star governance: North Star determines strategic direction and priorities; Goal Engine turns an accepted objective into executable work and evidence-backed progress.

## Model

`Goal → Tasks/Actions → Adaptive EXECUTE → Evidence → Learning → Progress → Next Action`

A goal contains priority, owner, status, explicit success criteria, progress, evidence, learnings, and next action. Decomposition creates normal Munin actions linked to the goal with `advances` relations, so the existing execution and context graph remain authoritative.

## Evidence policy

Progress is never accepted as an unsupported percentage. It can advance through:

1. successful reviewer-gated action execution, which automatically records execution evidence and the Adaptive Outcome Memory lesson; or
2. explicit manual confirmation with a non-empty evidence summary.

Execution-derived progress is calculated from completed actions belonging to the goal. A goal reaches `achieved` at 100%.

## Adaptive learning

When a goal action completes, its Adaptive Execution outcome ID and lesson are copied into the goal learning trail. The full outcome remains in Adaptive Outcome Memory; Goal Engine stores only the reference and goal-level summary.

## SITREP

Active goals are shown with priority, percentage, status, next action, evidence count, and learning count. Goal-linked actions are also identified in the prioritized next-action queue.

## CLI

- `munin goal add [P0|P1|P2] <title> | <criterion> [| criterion]`
- `munin goal list`
- `munin goal activate <goal-id>`
- `munin goal decompose <goal-id> <task> [| task]`
- `munin goal confirm <goal-id> <0-100> <evidence-summary>`
- `munin execute <action-id> <outcome>` advances linked goals automatically after reviewer validation.

## Guardrails

- No autonomous external publication or irreversible external action.
- No paid infrastructure.
- Goal progress requires execution evidence or explicit confirmation.
- North Star remains governance; Goal Engine is operational execution state.
- Sensitive personal information stays out of the public repository.
