# ADR-0003 — Provider-Neutral Reasoning Interface

- **Status:** Proposed
- **Date:** 2026-07-13

## Context

Munin's continuity must survive changes in model providers.

## Decision

All model interaction occurs through a provider-neutral interface. Domain modules cannot import provider SDKs directly.

## Consequences

- provider adapters own request and response translation;
- domain tests can use deterministic fake providers;
- provider-specific capabilities require explicit capability negotiation.

## Revisit trigger

This is a foundational invariant and should be superseded only through an accepted RFC.
