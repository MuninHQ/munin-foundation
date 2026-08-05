# RFC-017: Runtime Concurrency Control

## Status

Implemented.

## Context

Runtime recovery makes interrupted work resumable, but multiple workers could still attempt the same task concurrently. The runtime needs an ownership primitive that prevents duplicate execution without introducing a distributed database dependency.

## Decision

Introduce expiring task leases with worker ownership and monotonically increasing fencing versions.

A lease contains:

- task identifier;
- worker identifier;
- acquisition timestamp;
- expiration timestamp;
- fencing version.

An active lease blocks acquisition by another worker. The owner may renew or release it. After expiration, a different worker may acquire the task with a higher fencing version. Expired leases can be reaped deterministically.

## Safety properties

- At most one active owner is accepted for a task by a lease manager.
- Non-owners cannot renew or release a lease.
- Expired ownership does not block recovery.
- Fencing versions increase on each acquisition and can be used by future side-effect adapters to reject stale workers.
- Invalid lease durations are rejected.

## Scope

This increment provides the domain primitive and tests. It does not yet provide cross-process storage, distributed consensus or external side-effect fencing. Those capabilities require a persistent lease repository and adapter-specific enforcement.

## Acceptance criteria

- A second worker cannot acquire an active lease.
- An expired lease can be taken over.
- Renew and release require matching ownership.
- Expired leases can be reaped.
- Takeover increments the fencing version.
