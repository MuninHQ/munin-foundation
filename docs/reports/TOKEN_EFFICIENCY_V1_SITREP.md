# SITREP — Munin Token Efficiency v1

**Date:** 2026-09-24
**Branch:** `feature/token-efficiency-v1`
**Mode:** shadow/observation; disabled by default

## Outcome

Token Efficiency v1 is implemented as a provider-neutral observation layer. It records reported or locally estimated token/context usage, recommends an execution tier without routing authority, accumulates task/session budgets, emits warnings and fresh-session recommendations, creates redacted structured compaction/checkpoint artifacts, and generates projected or explicit-window observed reports. No executor, provider, prompt, retry, Promotion Gate decision, or productive context is changed.

## Architecture and changed files

- Configuration and activation: `.env.example`, `src/token-efficiency-config.ts`.
- Usage and telemetry: `src/token-efficiency-usage.ts`, `src/agent-telemetry.ts`, `src/secret-redaction.ts`.
- Advisory routing and budgets: `src/token-efficiency-router.ts`, `src/token-efficiency-budget.ts`.
- Structured continuity: `src/token-efficiency-compaction.ts`, `src/token-efficiency-checkpoint.ts`.
- Reporting: `src/token-efficiency-report.ts`, `src/token-efficiency-report-cli.ts`, `package.json`.
- Runtime integration: `src/token-efficiency-observer.ts`, `src/orchestrator-observability.ts`, `src/control-room-orchestrator.ts`, `src/agent-orchestrator.ts`.
- Worker/supervisor integration: `src/host-bridge-worker.ts`, `scripts/workspace-supervisor.mjs`.
- Promotion observation: `src/token-efficiency-promotion-observer.ts`, `src/capability-promotion-benchmark.ts`, `src/capability-radar-service.ts`.
- Operations/governance: `docs/operations/TOKEN_EFFICIENCY_V1.md`, design/plan documents, `CHANGELOG.md`, `ops/CURRENT_STATE.md`, `ops/SESSION_LOG.md`.
- Regression coverage: dedicated `tests/token-efficiency-*.test.ts` files plus updates to telemetry, orchestration, Promotion Gate and supervisor tests.

## Validation evidence

- Consolidated feature/integration gate: 61 passed, 0 failed.
- Complete `npm test`: TypeScript build passed; Vite production build passed; 772 tests passed, 0 failed, 0 skipped.
- `git diff --check`: clean after documentation normalization.
- Bounded credential scan: no added secret-shaped values; one pre-existing synthetic redaction fixture remains in `tests/chatgpt-memory-promotion.test.ts`.
- Independent whole-branch review initially found nine Important defects. Each was reproduced with a failing test, fixed in one RED-to-GREEN pass, and covered by the 61-test feature gate and 772-test full regression.

## Metrics observed and estimated

- Production usage samples observed in this delivery: **0**, because the feature intentionally ships disabled and no live provider workload was enabled for validation.
- Deterministic integration fixture: 1,000 reported tokens with a `deterministic_local` recommendation produced a 500-token projected reduction (50%). This proves report arithmetic and data flow; it is test evidence, not a production savings claim.
- True observed before/after reporting now requires two valid, ordered timestamp windows. The regression fixture compares 1,000 baseline tokens with 400 observation-window tokens and reports 600 tokens / 60% observed reduction.
- Dollar savings remain unavailable until both actual and counterfactual cost bases are known. Unknown models never receive invented pricing.
- Confidence is derived from usable reported/measured coverage. Estimated or redacted/unavailable samples cannot create high-confidence actual metrics.

## Safety and compatibility

- Top-level flag defaults to `0`; telemetry, report and checkpoint writes honor component gates.
- Usage persistence allowlists fields, bounds identifiers, preserves numeric token metrics, and drops raw provider payload fields.
- Telemetry, checkpoints, compaction and supervisor health apply secret redaction and size bounds.
- Observation callbacks consume synchronous exceptions and asynchronous rejections.
- Health flushing is time-bounded and cannot indefinitely block Control Room completion.
- Windows paths and atomic local writes use Node standard-library APIs only; no dependency or paid service was added.

## Residual risks and deferred minors

- The supervisor can display a prior health snapshot until a new enabled observation overwrites it; the snapshot includes its enabled state but not an observation timestamp.
- Host Worker exposes the tested completion-observation seam, but the current CLI does not attach a token-efficiency callback because Host Bridge jobs do not expose model/token usage.
- Invalid configuration warnings are retained in the loaded configuration but are not yet surfaced in the operator UI.
- Savings projections are heuristic counterfactuals until enough real shadow samples exist; reports label them `projected` and state their methodology.

## Exact remaining work before real routing

Real routing must remain disabled until all nine items are implemented and approved:

1. An enforcement-specific ADR and a configuration mode distinct from shadow observation.
2. A typed adapter between recommendations and `ProviderRegistry.select`, with explicit allowlists and deterministic fallback.
3. Execution-time provider/model availability and capability checks.
4. Minimum v1 observation coverage and recommendation-accuracy thresholds.
5. Quality-parity benchmarks per task class, including strong-model escalation tests.
6. Enforceable cost/context limits that can safely block or reroute rather than only warn.
7. Human approval for high-stakes or externally billed execution.
8. Canary rollout, rollback criteria, and audit evidence proving executor changes.
9. Updated Promotion Gate and security review approving enforcement behavior.

Until every item is complete, the router's output remains descriptive data and cannot select an executable provider.
