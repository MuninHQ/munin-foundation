# RFC-018: Persistent Runtime Leases

## Status

Implemented.

## Context

The in-memory lease manager prevents duplicate ownership only inside one process. Separate Munin workers can still execute the same persisted plan concurrently and race while reading or writing the runtime state.

## Decision

Persist leases in the runtime data directory and serialize lease mutations with an atomic filesystem lock directory.

The store retains:

- active leases;
- worker ownership;
- expiration timestamps;
- monotonically increasing fencing versions, including after release or expiry.

A leased runtime coordinator acquires a plan-level lease before invoking the execution engine and releases it in a `finally` block.

## Safety properties

- Two store instances sharing the same directory observe the same ownership state.
- An active lease blocks a different worker.
- Expired leases can be taken over.
- Fencing versions never reset after release or reaping.
- Only the owner can release a lease.
- A plan lease is released after successful or failed execution.

## Scope

This increment provides single-host, cross-process coordination through the filesystem. It does not provide distributed consensus across machines, heartbeat renewal during long executions or adapter-level enforcement of fencing versions.

## Acceptance criteria

- Lease ownership survives store re-instantiation.
- Concurrent store instances cannot both acquire an active lease.
- Takeover after expiration increments the fencing version.
- The runtime can execute a plan only while holding its persistent lease.
- Tests cover persistence, ownership, takeover, release and reaping.
