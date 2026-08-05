# RFC-023: Outbox Operations and Observability

## Status

Implemented.

## Context

The transactional outbox now supports durable intent, retries, backoff and dead-letter handling. Operators still need a concise way to understand queue health, identify aging work and safely inspect or requeue terminal entries.

## Decision

Add a read-only analytics layer over persisted outbox entries and a small operational CLI. The analytics layer reports status counts, ready and delayed work, oldest pending age, maximum attempts, health and explainable alerts.

Health states are:

- `healthy`: no failed, dead-lettered or aging backlog;
- `degraded`: retry backlog or pending work older than one hour;
- `critical`: dead-letter entries or pending work older than 24 hours.

The CLI supports human-readable status, JSON metrics, raw listing and explicit dead-letter requeue.

## Safety properties

- Status and metrics do not mutate the outbox.
- Requeue remains an explicit operator action.
- Health decisions are deterministic and explainable.
- Older outbox files remain compatible.
- No external adapter is invoked by the operations CLI.

## Commands

```text
outbox-ops status
outbox-ops json
outbox-ops list
outbox-ops requeue <entry-id>
```

## Acceptance criteria

- Empty queues report healthy.
- Ready and delayed entries are counted separately.
- Failed queues report degraded.
- Dead-letter or severely aged queues report critical.
- Alerts identify the exact condition driving health.
- Requeue delegates to the existing protected outbox operation.
