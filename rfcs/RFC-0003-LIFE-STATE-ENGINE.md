# RFC-0003 — Life State Engine

- **Status:** Draft
- **Created:** 2026-07-13
- **Depends on:** RFC-0002

## Responsibilities

- ingest authorized events;
- classify evidence;
- track source and time;
- propose state transitions;
- expose conflicts;
- decay stale assumptions;
- support correction and deletion;
- create explainable context packages;
- maintain an audit trail.

## Transition flow

1. Receive event.
2. Extract evidence.
3. Propose state change.
4. Run conflict and sensitivity checks.
5. Request confirmation when required.
6. Commit state.
7. Recalculate dependent views.
8. Write audit record.

## Non-responsibilities

The LSE must not silently turn weak inference into fact, make irreversible decisions alone, infer sensitive traits without necessity and authorization, or depend on one model provider.
