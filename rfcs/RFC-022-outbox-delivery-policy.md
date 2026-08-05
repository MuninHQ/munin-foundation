# RFC-022: Outbox Delivery Policy

## Status

Implemented.

## Context

The transactional outbox provides durable at-least-once delivery, but retrying every failed entry on every dispatcher cycle can overload a degraded dependency and keep permanently invalid work in an endless loop.

## Decision

Add an explicit delivery policy with:

- maximum attempts;
- exponential backoff;
- capped retry delay;
- `nextAttemptAt` eligibility;
- terminal `dead-letter` state;
- explicit operator-controlled requeue.

A failed entry is retried only after its next eligible timestamp. When the configured attempt budget is exhausted, it moves to dead-letter and is excluded from automatic dispatch. Requeue resets the attempt history for a deliberate new delivery cycle while preserving the same durable entry and idempotency key.

## Safety properties

- Failed destinations are not hammered continuously.
- Retry timing is deterministic and capped.
- Permanent failures stop consuming dispatcher capacity.
- Dead-letter entries remain inspectable and are never deleted automatically.
- Requeue is explicit rather than implicit.
- Applied entries remain immutable and are never dispatched again.

## Compatibility

Existing outbox files remain readable because the new fields are optional. The default policy allows five attempts with exponential backoff from one second to a maximum of one minute.

## Acceptance criteria

- A failed entry receives a future `nextAttemptAt`.
- Entries are skipped before that timestamp.
- Backoff increases per attempt and respects the configured cap.
- Exhausted entries move to `dead-letter`.
- Dead-letter entries are excluded from dispatch.
- An operator can explicitly requeue a dead-letter entry.
