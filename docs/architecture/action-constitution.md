# Munin Action Constitution

Issue: #121

## Principle

Treat model-generated intent as untrusted. A deterministic policy evaluates consequential actions independently of model reasoning.

## Action classes

- `read` — local inspection, allowed.
- `local-write` — bounded writes outside protected paths, allowed.
- `git-write` — local Git operations, allowed.
- `network-read` — read-only network retrieval, allowed.
- `external-write` — messages, publishing, remote mutations, payments or comparable side effects; requires user approval.
- `destructive` — deletion/reset/drop/format operations; requires user approval.

## Hard denies

Secret-like payloads and writes into `.env`, `.git`, `node_modules` or `data/runtime` are denied by policy regardless of model request.

## Audit

Every evaluated consequential action can be appended to `data/runtime/action-audit.jsonl`. The file is local/Git-ignored and append-only by the policy API. `ActionAuditLog.replay()` provides bounded newest-first retrieval with decision and action-class filters; replay is evidence inspection only and never re-executes an action.

## Integration sequence

1. Gate engineering file edits and Git delivery.
2. Gate Browser Operator actions before enabling writes.
3. Gate connector/external communications.
4. Add injection/red-team regression corpus.
5. Keep the model unable to override policy decisions.

This PoC intentionally implements the smallest native policy core instead of importing a third-party security runtime wholesale.
