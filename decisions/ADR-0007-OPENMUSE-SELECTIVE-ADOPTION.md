# ADR-0007 — Selective OpenMuse patterns, not an OpenMuse runtime

## Status
Accepted for implementation on `buildall/openmuse-selective-adoption`.

## Context
OpenMuse demonstrates useful patterns for durable agents: leased work, persistent browser sessions, human takeover, evidence and receipts. Munin already implements overlapping control-plane, approval, sandbox, memory and receipt capabilities. Installing OpenMuse wholesale would duplicate those systems and can introduce additional infrastructure or paid-provider paths.

## Decision
Adopt only three missing or weaker primitives:
1. crash-aware Host Bridge leases with conservative recovery;
2. named read-only Playwright session continuity with human handoff identity;
3. a tamper-evident evidence provenance ledger.

Keep Munin's existing approval executor, worktree sandbox, provider policy and operator surfaces.

## Consequences
- No mandatory new dependency or paid service.
- Consequential host operations fail closed after an uncertain crash.
- Browser continuity improves without promoting autonomous interaction.
- Evidence can be verified for tampering and linked by parent IDs.
- Full cross-reboot browser profile persistence and multi-process transactional workers remain explicit future work, not implied capabilities.
