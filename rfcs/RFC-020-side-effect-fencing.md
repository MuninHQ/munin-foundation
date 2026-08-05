# RFC-020: Side-Effect Fencing

## Status

Implemented.

## Context

Plan-level fencing prevents stale workers from returning accepted results, but an external adapter could still perform an irreversible write before the runtime notices that ownership was lost. Side-effect boundaries therefore need the same fencing guarantees as plan completion.

## Decision

Introduce a fenced side-effect executor that validates the active lease immediately before invoking an adapter.

Every request carries:

- operation and resource identifier;
- payload;
- lease key;
- worker identifier;
- fencing version;
- optional idempotency key.

The executor rejects stale fencing tokens before the adapter is called. Successful effects are recorded in a local audit log. Repeated requests with the same idempotency key return the recorded result without invoking the adapter again.

## Safety properties

- A stale worker cannot invoke a protected adapter.
- Adapter execution occurs only after current-lease validation.
- Repeated identical operations can be deduplicated.
- Applied effects retain worker and fencing provenance.
- The adapter contract remains transport-neutral.

## Scope

This increment provides the adapter boundary, local audit persistence and idempotency behavior. It does not provide distributed transactions or atomic coordination with third-party systems. Production adapters should also propagate idempotency keys to external APIs when supported.

## Acceptance criteria

- Current fencing tokens permit adapter execution.
- Stale tokens are rejected before adapter invocation.
- Duplicate idempotency keys do not repeat the effect.
- Applied results are persisted with provenance.
