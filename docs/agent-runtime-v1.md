# Munin Agent Runtime v1

Munin Agent Runtime v1 composes the existing autonomy, policy and sandbox primitives into one governed execution path.

## Execution model

1. Goal Engine ranks durable Munin goals and selects the next autonomous action using the existing autonomous-goals logic.
2. Sentinel converts the Action Constitution decision into three execution bands:
   - GREEN: read and network-read work may proceed automatically.
   - AMBER: local-write and git-write work may proceed only through the guarded/hard execution sandbox.
   - RED: external-write and destructive work requires an explicit approval; denied secret/protected-path actions remain blocked.
3. Every policy result is appended to the existing ActionAuditLog.
4. RED approvals are persisted in data/runtime/approval-queue.json and surfaced in the Action Inbox as P0 review items.
5. Watchers evaluate changed/equality/threshold conditions and can be used by domain workers to wake a goal only when evidence changes.

## Safety invariants

- Sentinel does not replace the Action Constitution; it layers execution behavior on top of the deterministic policy evaluator.
- An LLM cannot self-approve a RED action. ApprovalQueue resolution is a separate explicit step.
- AMBER execution resolves the existing ExecutionSandbox. Docker isolation is preferred when available; guarded native execution remains the fallback under the existing sandbox policy.
- Secrets and protected runtime paths continue to be blocked by the Action Constitution.

## Integration guidance

Career workers should use watchers for new/changed opportunities and fit-score thresholds. Research, ranking and draft generation can remain GREEN/AMBER; submitting an application or sending a recruiter message is RED.

Content/Video workers can research, script, assemble and validate under GREEN/AMBER. Publishing, purchasing assets or changing external accounts is RED.

## Example

A Career watcher observes a role moving from 79 to 87 fit. The Goal Engine prioritizes the career goal. Research and CV drafting are allowed; the final send email action becomes RED, is placed into ApprovalQueue, and appears in Action Inbox for review.

## Files

- src/sentinel.ts — risk bands and persistent approval queue.
- src/goal-engine.ts — durable-goal runtime snapshot.
- src/watchers.ts — condition evaluator.
- src/agent-runtime-v1.ts — composition root for goal, policy, audit, approval and sandbox routing.
- src/action-inbox.ts — pending approvals surfaced to the operator.
