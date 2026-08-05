# RFC-021: Transactional Outbox

## Status

Implemented.

## Context

Fenced side-effect execution validates ownership and suppresses duplicate requests, but a process can still fail between committing local intent and invoking an external adapter. Without a durable queue, the effect may be forgotten or require manual reconstruction.

## Decision

Introduce a filesystem-backed transactional outbox. Side-effect intent is persisted before dispatch and then progresses through explicit states:

- `pending`;
- `dispatching`;
- `applied`;
- `failed`.

Each entry includes the adapter identifier, fenced request, idempotency key, attempt count, timestamps, result and last error. Dispatch claims one entry before invoking its adapter. Successful execution marks it applied. Failures remain retryable. Stale dispatch claims can be returned to pending after a configured timeout.

## Safety properties

- Intent exists durably before external dispatch.
- Enqueue is idempotent by idempotency key.
- Applied entries are never dispatched again.
- Failed entries can be retried explicitly.
- Stale dispatch claims are recoverable.
- Every adapter invocation still passes through lease and fencing validation.
- External adapters receive the same idempotency key across retries.

## Limits

The local outbox and third-party system do not share a distributed transaction. Exactly-once behavior therefore depends on the destination honoring idempotency keys. The outbox provides durable at-least-once delivery with local duplicate suppression.

## Acceptance criteria

- Duplicate enqueue returns the existing entry.
- Pending entries can be dispatched and marked applied.
- Failed entries remain retryable with attempt history.
- Applied entries are not executed again.
- Stale dispatch claims can be recovered.
- Missing adapters are skipped without losing the queued entry.
