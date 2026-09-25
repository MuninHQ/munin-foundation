# Production wave engineering

Munin's BUILD ALL parallelism is safe only when Git state follows the same dependency graph as the task planner.

## Rule

Independent tasks in one wave may execute from the same base ref in isolated worktrees. Their commits are never merged independently into `main`.

After every wave, the orchestrator reconciles task commits serially into a dedicated integration worktree. The resulting integration HEAD becomes the base ref for the next wave.

```text
main
  ├─ task A worktree -> commit A
  └─ task B worktree -> commit B

integration worktree
  main -> cherry-pick A -> cherry-pick B -> integration HEAD 1

next wave
  task C worktree starts from integration HEAD 1
```

## Failure behavior

- A failed or blocked task prevents reconciliation of that wave.
- A cherry-pick conflict aborts reconciliation and rolls the integration worktree back to its pre-wave HEAD.
- Dependent waves never start after a failed task or reconciliation conflict.
- Tasks that legitimately require no change are recorded without synthetic commits.
- The integration branch remains isolated from `main` until broad validation and independent verification are complete.

## Current seam

`GitWaveReconciler` implements the serial Git reconciliation boundary.

`ReconciledWaveEngineeringRuntime` propagates each reconciled integration HEAD into the next wave through the `BaseAwareEngineeringRuntime` contract.

The existing `EngineeringAgentRuntime` still assumes `main` as its starting base. It must be split or adapted before it can implement `BaseAwareEngineeringRuntime`; this is intentionally not bypassed with prompt text or mutable global state because doing so would make dependency correctness non-deterministic.
