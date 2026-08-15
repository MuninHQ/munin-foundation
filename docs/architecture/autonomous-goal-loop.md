# Autonomous Goal Loop

## Purpose

The Autonomous Goal Loop turns accepted Munin goals into a bounded operating cycle that can prioritize work, create missing next actions, execute clearly local/reversible work through the existing runtime, validate completion, record learning, and continue until the goal is done or user-controlled action is genuinely required.

## Loop

`Goals → Prioritize → Next Action → Guardrail → Local Runtime → Reviewer Gate → Evidence/Learning → Replan → Continue`

## Prioritization

The prioritizer scores active/planned/blocked goals using:

- P0/P1/P2 priority;
- current status;
- progress (including a completion bias near 100%);
- staleness since the last update;
- presence of pending executable goal-linked actions.

Blocked goals are penalized so executable work is preferred when otherwise comparable.

## Next-action generation

When the selected goal has no pending executable action, the loop creates a normal Munin Action from the next success criterion. The Action is linked to the Goal with the existing `advances` relation and then passes through the same loop on the next cycle.

## Failure memory and replanning

Runtime failures are persisted into Adaptive Outcome Memory with `goal:<id>` capability, failure evidence and an explicit lesson against blind retries. Reviewer-gate rejection is already persisted by Adaptive Execution and is handled as a failed autonomous cycle.

After two relevant failures, the planner no longer selects the same execution path. Existing planned/active actions for that goal are moved to `blocked`, and a new `Review and replan goal ...` Action is created. Blocked Actions remain visible as history but are excluded from autonomous executable-action selection.

This turns failure history into an operational routing signal rather than a passive log.

## Autonomy guard

Autoexecution is intentionally conservative.

Clearly local/reversible work such as build, implementation, refactoring, testing, validation, research, analysis, documentation, planning and design may proceed automatically.

Actions that may create external or irreversible effects stop with `needs_user`. Initial protected verbs include send, email, message, publish, post, apply, submit, pay, purchase, buy, delete, remove, deploy, release, transfer, invite and schedule.

Unknown actions also stop rather than being assumed safe.

## Runtime execution

Safe actions use the existing `ExecutionEngine`, so provider selection remains governed by the offline/local zero-cost provider policy and existing quality gate. Runtime success alone does not complete the Action: the result is passed to the existing reviewer-gated `MuninService.execute`, which records Adaptive Outcome Memory, Goal evidence and Goal learning.

Runtime failure leaves the Action unfinished, records a failed Outcome Memory record, and emits `goal.autonomy_runtime_failed`.

## Bounded execution

`munin goal loop [max-cycles]` defaults to five cycles and accepts a maximum of twenty. The loop terminates with one of:

- `completed` — autonomous work completed and no further active goal remains;
- `idle` — there was no work to start;
- `needs_user` — the next selected action requires user-controlled external/irreversible behavior;
- `failed` — local runtime or reviewer-gated completion failed;
- `cycle_limit` — more work remains after the configured bound.

## Observability

The event stream records:

- `goal.autonomy_planned`
- `goal.autonomy_executed`
- `goal.autonomy_blocked`
- `goal.autonomy_runtime_failed`

SITREP exposes these events in an `Autonomous goal loop` section.

## Safety invariant

The loop may decide and continue without asking for confirmation only while work stays local, reversible and zero-cost. A user-control stop must represent an actual external/irreversible boundary, not a routine confirmation step.
