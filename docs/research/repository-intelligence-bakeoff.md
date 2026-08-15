# Repository intelligence bake-off

Issues: #116, #123

## Decision

Use the repository itself as the source of truth. Prefer **rag-rat** as the optional always-on local repository-intelligence index. Keep **Graphify** as an on-demand structural graph/report experiment rather than operating two authoritative knowledge stores.

## Primary-source evidence

### rag-rat

The project is explicitly a local repository-intelligence index + MCP server. It links source, callers/callees, tests, git/GitHub history, invariants, risks and source-anchored durable rationale. It stores its own SQLite data and reports provenance/confidence/coverage. Windows x64 is supported by the prebuilt package and local embeddings are available without a paid service.

Source: https://github.com/cq27-dev/rag-rat

### Graphify

Graphify provides deterministic local AST extraction for code with explained `EXTRACTED`/`INFERRED` edges and outputs a queryable graph/report without requiring embeddings for code mapping. It is well suited to structural maps and impact exploration, but overlaps less directly with Munin's need to preserve repository rationale/history.

Source: https://github.com/Graphify-Labs/graphify

## Architecture

`Git/files/history (authoritative) -> optional rag-rat index -> Munin engineering context`

`Git/files -> optional Graphify on-demand structural report`

Neither index may silently override repository files, ADRs, Git history or Munin Project Memory.

## Promotion benchmark

1. symbol/caller/callee accuracy;
2. test and impact-surface discovery;
3. rationale/history retrieval;
4. provenance and confidence;
5. query latency and incremental update cost;
6. local RAM/disk/CPU;
7. Windows/Ollama/offline operation;
8. MCP/Skill integration cost;
9. failure fallback to native Git/file inspection;
10. measurable reduction in unnecessary source reads during autonomous builds.
