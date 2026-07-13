# ADR-0002 — PostgreSQL as the Initial System of Record

- **Status:** Proposed
- **Date:** 2026-07-13

## Context

Munin requires transactions, temporal metadata, auditability, evolving payloads, relationships, and potentially vector retrieval.

## Decision

Use PostgreSQL as the initial authoritative data store.

## Consequences

- relational constraints for core entities;
- JSONB for evolving event payloads and assertion values;
- optional pgvector later;
- no graph database in the MVP;
- embeddings remain derived indexes, not truth.

## Revisit trigger

Revisit only after measured query patterns or scale demonstrate a material limitation.
