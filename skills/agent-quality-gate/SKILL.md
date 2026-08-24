---
name: agent-quality-gate
description: Verify non-trivial agent output against objective evidence before Munin accepts delivery or promotes a procedure.
version: 1.0.0
triggers: evaluate-agent,agent-review,quality-gate,verify-output,self-evaluate
permissions: read
source: adapted-from-everything-claude-code-agent-evaluator
---
# Agent Quality Gate

Use this skill after a non-trivial agent task and before Munin treats the result as authoritative, complete, reusable, or ready for merge/release.

Evaluate the delivered result, not the agent's effort or confidence. Prefer repository files, diffs, tests, traces, logs, command output and explicit acceptance criteria over narrative claims.

## Required checks

Score the result on five axes from 1 to 5:

1. Accuracy — claims match observable evidence and the implementation behaves as stated.
2. Completeness — all requested requirements and explicit acceptance criteria are covered.
3. Clarity — the result explains what changed, what was verified and what remains uncertain.
4. Actionability — the output leaves Munin or the user with a concrete usable result rather than deferred work.
5. Conciseness — the report is dense enough to inspect quickly without hiding relevant caveats in filler.

A score below 5 must cite the specific gap. Do not assign 5 without evidence.

## Blocking conditions

Block completion when any of the following is present:

- correctness, security, privacy, data-loss or secret-handling risk;
- claimed validation that was not actually run;
- material requirements left incomplete without being surfaced;
- a new mandatory paid/provider dependency introduced against project rules;
- weakened approval, audit or rollback boundaries;
- broad unrelated changes that cannot be traced to the objective.

## Evidence protocol

For engineering work, inspect the relevant diff/files and test evidence. Verify that claimed files actually exist and that reported tests correspond to the changed behavior. A green broad suite does not replace checking the objective itself.

For research/analysis work, verify source quality, freshness where relevant, whether conclusions distinguish evidence from inference, and whether recommendations map to a concrete Munin problem.

For reusable skills/procedures, confirm they do not duplicate an existing skill and satisfy the criteria in `skills/hermes-learning-loop/SKILL.md`.

## Verdict

Produce one verdict:

- `accept` — evidence supports delivery;
- `accept_with_notes` — useful and safe, with non-blocking limitations recorded;
- `repair` — bounded fixes are required before acceptance;
- `reject` — result is materially wrong, unsafe, ungrounded or violates project constraints.

When verdict is `repair`, identify the smallest concrete fixes and re-run the gate after repair. Do not broaden scope.

## Compact report format

Report:

- objective;
- evidence inspected;
- five axis scores;
- blocking findings, if any;
- top improvements;
- verdict.

Keep the report concise and auditable. Do not re-perform the original task unless a verification step is required to validate a claim.
