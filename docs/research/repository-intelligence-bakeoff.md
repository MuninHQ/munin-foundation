# Repository intelligence bake-off — Graphify vs rag-rat

Issues: #116, #123

## Decision

Use **rag-rat as the primary optional repository-intelligence candidate** for Munin's engineering runtime. Keep **Graphify as an on-demand structural/visual graph adapter**. Neither becomes a hard dependency or an authoritative store: Git, source files, ADRs and repository history remain the source of truth, with Munin-native inspection as the deterministic fallback.

This is an asymmetric hybrid: rag-rat is aimed at operational preflight/retrieval; Graphify remains useful for persistent explorable graphs across code and documents.

## Constraints

- zero additional paid dependency
- local-first and source read-only
- Windows support
- graceful absence/failure
- provenance on answers
- no replacement of Munin operational/personal memory
- no generated index committed by default

## Capability scorecard

Scores are 1 (weak) to 5 (strong), based on documented capabilities and Munin fit. Machine-specific performance remains a separate local benchmark.

| Criterion | Weight | Graphify | rag-rat | Notes |
| --- | ---: | ---: | ---: | --- |
| code relationship / graph | 15 | 5 | 5 | Both provide structural graph navigation; rag-rat can add SCIP-assisted resolution. |
| impact preflight | 15 | 4 | 5 | rag-rat exposes an impact surface combining callers, callees, tests and history. |
| source provenance | 10 | 5 | 5 | Graphify labels extracted/inferred edges; rag-rat reports provenance plus confidence/coverage. |
| git/GitHub rationale | 15 | 2 | 5 | rag-rat has papertrail/history as a first-class retrieval source. |
| ADR/docs linkage | 10 | 5 | 4 | Graphify's heterogeneous graph is especially strong for docs/media. |
| incremental operation | 10 | 4 | 5 | Both update incrementally; rag-rat is designed as a continuously queryable local index/MCP. |
| runtime/MCP integration | 10 | 3 | 5 | rag-rat exposes a dedicated MCP server and coding-agent preflight tools. |
| answer “why does this exist?” | 10 | 4 | 5 | rag-rat combines source, history and durable source-anchored rationale. |
| operational simplicity | 5 | 4 | 4 | Both are optional local tools; Graphify adds Python, rag-rat ships a Windows x64 binary/npm wrapper. |

Weighted fit: Graphify **4.0/5**, rag-rat **4.85/5**.

## Primary-source evidence

- rag-rat: https://github.com/cq27-dev/rag-rat
- Graphify: https://github.com/Graphify-Labs/graphify

## Munin adapter contract

Munin should depend on a stable internal contract rather than either external CLI:

```ts
export type RepoEvidence = {
  source: 'native' | 'rag-rat' | 'graphify';
  path?: string;
  symbol?: string;
  rationale?: string;
  confidence?: number;
};

export type RepoImpact = {
  query: string;
  files: string[];
  symbols: string[];
  tests: string[];
  evidence: RepoEvidence[];
  coverage: 'partial' | 'indexed' | 'unknown';
};
```

Provider priority for engineering preflight:

1. rag-rat when configured and healthy;
2. Graphify for structural/path questions when a current graph exists;
3. Munin-native Git/source inspection as deterministic fallback.

External provider output is advisory evidence. It never authorizes a consequential action by itself.

## Frozen benchmark queries

Use the same queries for every provider:

1. What calls `EngineeringAgentRuntime.execute`, directly or indirectly?
2. What is the blast radius of changing durable-effect reconciliation?
3. Which tests protect mobile document ingestion?
4. Why does the engineering runtime fail closed on uncertain effects?
5. Which ADR/RFC/docs explain the action-policy boundary?
6. Which files should be read before modifying provider preflight?

Record cold index time, incremental refresh time, query p50/p95, peak working set where observable, relevant files/symbols versus a manually reviewed gold set, incorrect relationships, provenance completeness and historical-rationale usefulness.

## Adoption gates

Promote rag-rat from candidate to default optional provider only if the Windows benchmark shows:

- >= 90% recall on the reviewed high-risk impact gold set;
- no fabricated source anchors in the frozen queries;
- incremental refresh materially cheaper than a full re-index;
- provider failure cleanly falls back to native inspection;
- no paid service or remote embedding required.

Graphify may be promoted independently for visualization/project-knowledge exploration if its measured value exceeds its maintenance cost.

## Security / privacy

Keep indexes outside committed source unless explicitly requested. Never index `.env`, credentials, runtime secrets or protected local state. Prefer local embedding/extraction. Any future remote backend requires Munin's outbound-data policy gate.

## Outcome

The bake-off does **not** justify building a third repository index from scratch. The next implementation is a small optional `RepoIntelligenceProvider` adapter with health detection and native fallback, followed by the Windows benchmark.