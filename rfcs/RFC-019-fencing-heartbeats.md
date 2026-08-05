# RFC-019: Fencing Enforcement and Heartbeats

## Status

Implemented.

## Context

Persistent leases prevent two workers from intentionally starting the same plan, but a long execution can outlive its lease. After expiry, another worker may take over while the original worker is still running. Without heartbeat renewal and final fencing validation, the stale worker could return a result after losing ownership.

## Decision

Add two complementary controls:

- periodic lease renewal while a plan is running;
- fencing-token validation immediately before accepting the execution result.

The acquired lease version is immutable for the worker. Renewal succeeds only when the worker identifier and version still match the active, unexpired lease. Release may also require the matching version, preventing a stale worker from deleting a newer worker's lease.

## Safety properties

- Long-running work retains ownership while heartbeats succeed.
- A stale worker cannot renew a lease after takeover.
- A stale worker cannot release a newer lease.
- A result is accepted only while the original fencing token is current.
- Heartbeat failures are surfaced instead of silently ignored.
- Heartbeat intervals must be shorter than lease duration.

## Scope

This increment protects plan-level local execution and result acceptance. External side-effect adapters must still validate fencing tokens at their own write boundaries before distributed or irreversible effects are enabled.

## Acceptance criteria

- Current workers can renew without changing fencing version.
- Wrong worker or wrong version is rejected.
- Takeover invalidates the previous worker.
- Long executions remain leased through periodic renewal.
- Release cannot remove a lease with a newer fencing version.
