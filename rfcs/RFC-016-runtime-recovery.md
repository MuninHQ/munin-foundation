# RFC-016: Runtime recovery and idempotent resume

## Status

Accepted for M9.6 implementation.

## Context

The runtime persists plans, but an interrupted process can leave tasks in `RUNNING`, `WAITING`, or `BLOCKED`. Re-running the full plan risks duplicating completed work or losing the distinction between a transport failure and an interrupted execution.

## Decision

Introduce a recovery boundary that reads the persisted execution plan, creates an explicit checkpoint, and prepares only incomplete work for resumption.

A checkpoint contains:

- the plan identifier;
- completed task identifiers;
- recoverable task identifiers;
- the capture timestamp.

Recovery follows these rules:

1. `DONE` tasks are immutable and retain their results.
2. Interrupted `RUNNING`, `READY`, `WAITING`, and `BLOCKED` tasks are requeued.
3. `FAILED` tasks remain failed unless forced recovery is explicitly requested.
4. Runtime timestamps and transient errors are cleared only for requeued tasks.
5. Repeated recovery is idempotent and does not duplicate tasks or results.

## Safety

Recovery changes only local persisted execution state. It does not replay external side effects, call providers, or infer whether an external action was completed. Providers with side effects will require idempotency keys before they can participate in automatic recovery.

## Consequences

The runtime can safely resume interrupted local work while preserving auditability. Future scheduler and daemon implementations can use the checkpoint contract without depending on CLI process lifetime.

## Non-goals

- Distributed locks.
- Cross-machine recovery.
- Automatic replay of external side effects.
- Persistent circuit-breaker state.
