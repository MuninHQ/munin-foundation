# Token Efficiency v1 Operations

Token Efficiency v1 is a local, provider-neutral observation layer. It records usage quality, recommends an execution tier, evaluates context budgets, creates structured compaction/checkpoint artifacts on request, and produces projected savings reports. It never selects an executor or provider.

## Safe activation

The feature is disabled by default. Set `MUNIN_TOKEN_EFFICIENCY_ENABLED=1` to enable observation. Component flags default to enabled beneath that top-level switch:

- `MUNIN_TOKEN_EFFICIENCY_TELEMETRY_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_ROUTER_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_BUDGET_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_COMPACTION_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_CHECKPOINT_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_REPORT_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_PROMOTION_OBSERVATION_ENABLED`

Task thresholds default to 32,000 warning tokens and 64,000 critical tokens. Session thresholds default to 128,000 warning, 224,000 critical, and 272,000 fresh-session recommendation. Invalid or unordered overrides fall back to the complete safe default threshold set.

Rollback requires only clearing `MUNIN_TOKEN_EFFICIENCY_ENABLED` or setting it to `0`. No database, service, package, or schema rollback is needed.

## Runtime artifacts

All paths are relative to `MUNIN_DATA_DIR` (default `data/runtime`):

- `telemetry/agent-events.jsonl`: redacted observation events.
- `token-efficiency/health.json`: bounded supervisor health snapshot.
- `token-efficiency/reports/`: projected report output.
- checkpoint directory chosen by the calling workflow: structured handoff artifacts.

Raw prompts and raw provider responses are not persisted. Telemetry failures do not fail productive execution.

## Metric quality

- `measured`: directly measured by a trusted local boundary.
- `provider_reported`: supplied by the execution provider.
- `estimated`: deterministic byte-based local estimate.
- `unavailable`: no defensible value exists.

Unknown models never receive an invented dollar cost. A report uses `projected` unless explicit baseline and observation windows support a true before/after comparison. Dollar savings remain absent unless both actual and counterfactual cost bases are known.

## Report command

Run `npm run token-efficiency:report`. The command reads local JSONL telemetry and writes a timestamped projected report. Use `-- --source=C:\absolute\path\events.jsonl` to read a different local event file.

## Real-routing activation boundary

Shadow recommendations cannot be connected to provider selection until a separate governed version delivers all nine requirements:

1. An enforcement-specific ADR and a mode distinct from shadow observation.
2. A typed adapter into `ProviderRegistry.select` with explicit allowlists and deterministic fallback.
3. Execution-time provider/model availability and capability checks.
4. Minimum observation coverage and recommendation-accuracy thresholds established from v1 data.
5. Quality-parity benchmarks per task class, including strong-model escalation.
6. Enforceable cost/context limits with safe block or reroute behavior.
7. Human approval for high-stakes or externally billed execution.
8. Canary rollout, rollback criteria, and audit evidence for executor changes.
9. Promotion Gate and security approval for enforcement behavior.

Until all nine exist and are approved, Token Efficiency remains advisory.
