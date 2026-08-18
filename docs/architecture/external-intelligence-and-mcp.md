# External Intelligence, Independent Review and MCP Bridge

Status: implemented MVP
Date: 2026-08-18

## Goal

Extend Munin with external reasoning/research and independent engineering review without creating a second orchestrator or making a paid provider mandatory.

## Architecture

Munin remains the system of record and primary orchestrator. External GPT-class services are optional runtime capabilities behind the existing `RuntimeCapabilityRegistry` seam.

### `intelligence.external`

Provider-neutral research/analysis capability. It selects the first available provider and falls back locally when no external endpoint is configured.

Optional environment variables:

- `MUNIN_EXTERNAL_INTELLIGENCE_URL`
- `MUNIN_EXTERNAL_INTELLIGENCE_TOKEN`

The HTTP contract is intentionally provider-neutral. The endpoint receives an `ExternalIntelligenceInput` JSON body and should return a JSON object containing at minimum `summary`, with optional `provider` and `evidence`.

### `engineering.independent-review`

Independent post-build review gate. It accepts objective, implementation summary, changed files, tests, evidence and acceptance criteria. When an external provider exists it can obtain a second-opinion review; without one it runs a deterministic local evidence gate.

This capability must not replace the normal QA verifier. It is an additional reviewer, preventing the same implementation path from being the sole authority for completion.

### `MuninMcpBridge`

A provider-neutral command bridge mapping future MCP-facing commands to governed Munin runtime capabilities. Initial live bindings:

- `munin.intelligence.research` -> `intelligence.external`
- `munin.engineering.review` -> `engineering.independent-review`

Reserved commands already modeled for future binding:

- `munin.sitrep`
- `munin.build`
- `munin.career.analyze`
- `munin.memory.search`
- `munin.linkedin.compose`

Unbound commands fail closed. A full network-facing MCP transport can be added later without changing the command or capability contract.

## Design constraints

- No second orchestrator.
- No mandatory paid service.
- No new npm dependency for the MVP.
- External provider credentials stay outside the repository.
- External results return to Munin; they do not become an independent system of record.
- MCP-facing commands invoke existing governed capabilities rather than bypassing policy gates.

## Next promotion criteria

Promote from MVP when:

1. at least one governed external provider is connected and benchmarked;
2. independent review is inserted automatically after engineering missions;
3. remaining MCP commands have first-class runtime capability bindings;
4. a standards-compliant MCP transport is exposed only after authentication and permission boundaries are defined.
