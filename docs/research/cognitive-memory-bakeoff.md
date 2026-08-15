# Cognitive memory bake-off

Issue: #118

## Decision

Do **not** replace Munin's native continuity/project memory with a third-party stack at this stage.

Use Munin-native memory as the system of record and adopt external memory engines only behind an optional adapter if a measured workload proves they add enough value.

## Evidence snapshot

| Candidate | Local-first | Temporal / contradictions | Retrieval | Procedural memory | Operational fit | Decision |
|---|---|---|---|---|---|---|
| Munin native | yes | supersession + freshness | lexical/current context | project + skill layer | zero new runtime | **system of record** |
| MIND-Mem | yes | governance + negation/recency | BM25F + optional vector + RRF | capability-rich | large MCP/tool surface | research adapter only |
| YantrikDB | yes, SQLite | decay + contradiction + consolidation | bundled/vector recall + graph | first-class procedures/skills | compact local MCP, but engine AGPL | **best optional cognitive adapter candidate** |
| Graphiti | self-hostable | strong bi-temporal model | semantic + BM25 + graph | not primary focus | heavier graph/runtime footprint | temporal-graph benchmark baseline |
| Engram | local-oriented | candidate lifecycle semantics | candidate | candidate | insufficient evidence in current primary-source sweep | defer |

## Why

Munin already has the properties that matter most for durable personal/project continuity: explicit provenance, confirmed/inferred confidence, freshness, supersession, backups, deterministic local storage and separate project continuity. Replacing that layer now would create migration risk and overlapping truth stores.

YantrikDB is the strongest candidate for a narrow experimental adapter because its MCP server defaults to local SQLite, provides contradiction/consolidation/temporal/procedural primitives, and can run with a bundled local embedder. Its underlying engine is AGPL-3.0, so Munin must keep the integration at an optional process/MCP boundary rather than embedding/forking it casually.

MIND-Mem is attractive for deterministic governed retrieval and hybrid BM25/vector/RRF, but its broad capability/tool surface overlaps significantly with capabilities Munin now owns directly.

Graphiti remains the baseline when a true temporal knowledge graph becomes necessary; it offers temporal validity/provenance and hybrid semantic/keyword/graph retrieval, but is more infrastructure than Munin currently needs for its primary local-first continuity path.

## Architecture rule

`Munin native memory (authoritative) -> optional cognitive adapter -> derived recall/graph signals`

External adapters MUST NOT silently become authoritative, mutate native facts without an explicit Munin write, or create an unrecoverable dependency.

## Benchmark harness

Future adapters are measured against the native control with the same corpus and queries:

1. exact long-horizon recall;
2. superseded fact resolution;
3. contradiction surfacing;
4. provenance reconstruction;
5. procedural/skill recall;
6. latency p50/p95;
7. disk/RAM footprint;
8. fully offline behavior;
9. export/backup/migration;
10. failure behavior when the adapter is unavailable.

## Promotion gate

An adapter may be promoted only if it materially improves recall/temporal reasoning on representative Munin data while preserving local-first operation, recoverability, provenance and zero paid dependency. Native memory remains the fallback and source of truth.