# RFC-005 — Context Engine M3

- Status: Implemented
- Phase: M3
- Date: 2026-08-05

## Summary

The Context Engine adds explicit, typed relationships between Munin entities. It allows projects, decisions, actions, and job opportunities to form an inspectable context graph without introducing a separate graph database.

## Problem

Munin v0.1 stored useful records, but each collection was isolated. A user could inspect projects or decisions, but could not ask which decisions support a project, which actions depend on another record, or what context surrounds a specific entity.

## Model

A relation contains:

- source entity type and identifier;
- relation type;
- target entity type and identifier;
- immutable identifier and creation timestamp.

Supported relation types:

- `relates_to`;
- `blocks`;
- `depends_on`;
- `supports`;
- `generated_by`.

## Behavior

- Both endpoints must exist before a relation is created.
- Repeating the same source, relation type, and target is idempotent.
- Relations are persisted in the existing local state file.
- Older state files remain compatible because missing relation arrays default to empty.
- Every created relation emits an append-only event.
- Context queries return incoming and outgoing relations separately.

## CLI

```text
munin relation add <source-type> <source-id> <relation-type> <target-type> <target-id>
munin context related <entity-id>
```

## Non-goals

- Multi-hop graph traversal.
- Ranking or inference from graph structure.
- External graph databases.
- Automatic relation creation from unverified text.

## Acceptance criteria

- Valid relations are persisted and queryable.
- Missing endpoints are rejected.
- Duplicate relation creation is idempotent.
- Existing state files load without migration steps.
- Automated tests cover creation, retrieval, persistence, and validation.
