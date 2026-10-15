# Context Efficiency Operating Guide

Munin reduces context with deterministic evidence before model inference.

## Workflow

1. Inspect Git status, changed files, tracked paths, and relevant history.
2. Search names and symbols with `rg`; read bounded excerpts around matches.
3. Admit files only with relevance evidence and within explicit character, estimated-token, and per-file budgets.
4. Prefer TypeScript, project scripts, focused tests, and deterministic parsers before an LLM call.
5. Reduce large output to head, unique diagnostics, and tail. Test output additionally preserves failed tests, bounded stacks, suite counts, duration, and exit code.
6. Persist a compact Build State containing objective, decisions, relevant files, blockers, tests, and next action. Reuse its history digest after compaction.
7. Review from affected diffs, Build State, constraints, and verification evidence; unrelated dirty paths are named but not read.

`RepositoryContextSelector` never replaces unavailable Git or `rg` with a recursive read. Missing commands produce a degraded diagnostic. Binary, generated, ignored, unproven, and oversized inputs are excluded by the budget gate.

Capabilities are selected lazily. Only the cheapest available set covering required capabilities becomes active; optional missing MCPs do not block deterministic core work and are never installed or authenticated automatically.

Model tiers are portable: economy for search/triage, standard for bounded changes, premium only for justified complex/high-impact work with trustworthy availability. Provider Registry eligibility, zero-cost policy, and cost ceilings remain authoritative.

## Diagnostics

- CLI: `npm run efficiency:status`
- API: `GET /api/efficiency/status`
- Manual packet: `POST /api/efficiency/manual-web-packet`
- UI: `/token-efficiency.html`

`contextEfficiency` reports observed local counts. `creditSavingsProxy` is a heuristic estimate of avoidable context tokens, not realized credits, provider billing, currency, or monetary savings. Telemetry and checkpoints are local, bounded, redacted, and non-blocking. Malformed rows are skipped and store failures cannot change the governed task outcome.
