# RFC-010: Foundation Hardening

## Status

Accepted for implementation.

## Context

Munin now spans projects, actions, decisions, career, research, relations, events and an executive dashboard. As the state model grows, silent corruption and unstable consumer contracts become material risks.

## Decision

M8 introduces a framework-independent foundation boundary with two responsibilities:

1. Validate referential integrity and duplicate identifiers across the complete state.
2. Produce a versioned JSON snapshot suitable for a future HTTP, desktop or web interface.

The domain remains independent from transport frameworks. The snapshot is a projection, not a second source of truth.

## Integrity rules

The validator reports, without mutating state:

- duplicate entity and relation identifiers;
- relation sources that do not exist;
- relation targets that do not exist;
- research records linked to missing projects;
- synthesis versions referencing missing evidence.

Every issue has a stable code, path and human-readable message.

## API snapshot contract

The snapshot includes:

- `schemaVersion`;
- generation timestamp;
- `ok` or `degraded` health;
- cross-domain summary counts;
- full read-only state;
- complete integrity report.

Version `1.0` is the first compatibility boundary. Future breaking changes require a new schema version.

## Non-goals

M8 does not:

- start an HTTP server;
- select a frontend framework;
- repair corrupt data automatically;
- add authentication or remote persistence;
- expose private runtime data in the public repository.

## Acceptance criteria

- A valid state produces no integrity issues.
- Duplicate identifiers and orphan graph edges are detected.
- Research provenance references are validated.
- The API snapshot has a deterministic, versioned shape.
- Existing commands and persisted state remain compatible.
- TypeScript build, automated tests and Markdown checks pass.
