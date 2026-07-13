# ADR-0001 — Start with a Modular Monolith

- **Status:** Proposed
- **Date:** 2026-07-13

## Context

Munin needs clear domain boundaries, but the team is at discovery stage and has not demonstrated scaling or organizational needs that justify distributed services.

## Decision

Begin `munin-core` as a modular TypeScript monolith.

## Consequences

Positive:

- simpler local development;
- atomic transactions;
- easier refactoring;
- lower operational burden;
- clear extraction path if future services become justified.

Negative:

- boundaries require discipline;
- poor module design could create internal coupling.

## Revisit trigger

Revisit when a module requires an independent security boundary, scaling model, release cadence, or team ownership.
