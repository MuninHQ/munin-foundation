---
name: parallel-work-coordination
description: Coordinate multiple agents only when workstreams are independent, with explicit ownership, integration order, and evidence requirements.
---

# Parallel Work Coordination

## Use when

Two or more tasks can proceed without editing the same files, relying on unfinished output from another task, or sharing mutable state.

## Procedure

1. Define the shared objective and integration owner.
2. For each workstream, specify owner, inputs, allowed files, expected output, validation, and stop conditions.
3. Identify sequencing dependencies before dispatch.
4. Dispatch independent tasks in parallel.
5. Require concise evidence and changed-file summaries from every worker.
6. Integrate sequentially, resolving conflicts deliberately.
7. Run end-to-end validation after integration.
8. Record unresolved assumptions and rejected outputs.

## Do not parallelize

- competing edits to the same files;
- architecture decisions that constrain all workstreams;
- migrations and dependent schema changes;
- final release or merge decisions;
- tasks whose validation depends on another unfinished task.
