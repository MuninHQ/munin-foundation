# Munin Token Efficiency v1 Design

**Status:** Approved design, pending implementation-plan approval  
**Date:** 2026-09-24  
**Scope:** Shadow/observation mode only

## Intent

Munin Token Efficiency v1 adds an observable, provider-neutral efficiency layer to Munin's existing agent orchestration. It measures context, token, and cost usage when providers expose those values; estimates them conservatively when they do not; recommends an execution tier without changing the selected executor; warns when task or session context approaches configured budgets; produces structured compact summaries and fresh-session handoffs; and reports estimated savings.

The v1 succeeds when operators can answer four questions from durable evidence:

1. What context, token, and cost usage did a task or session consume?
2. Which execution tier would Munin have recommended, and why?
3. When should context be compacted or moved to a fresh session?
4. What savings might routing and compaction produce, with observed facts clearly separated from estimates?

## Constraints and Non-goals

- Production execution behavior must remain unchanged. The router records recommendations but never selects or replaces an executor, model, or provider.
- No paid service or new runtime dependency is introduced.
- Windows remains a first-class runtime.
- Ollama, deterministic-local, Manus bridge, Host Worker, provider policy, supervisor, and orchestration paths retain their current semantics.
- Telemetry failures never fail or block productive work.
- Runtime observations are local, redact secrets before persistence, and do not persist raw prompts or raw provider responses.
- Estimates are labeled as estimates and never presented as measured fact.
- Skill Promotion Gate integration is observational; v1 does not promote, reject, or modify a skill or capability candidate.
- Automatic session creation, automatic context replacement, live model switching, billing enforcement, and enforcement-mode budgets are out of scope.

## Architectural Fit

The feature extends existing seams instead of creating a parallel control plane:

- `agent-telemetry.ts` remains the event envelope and durable JSONL telemetry mechanism.
- `orchestrator-observability.ts` remains the wrapper around supervisor/agent execution.
- `provider-policy.ts` remains the authoritative provider selection mechanism. Token Efficiency can observe its result but cannot mutate it.
- Agent orchestration context remains the canonical task/run boundary.
- Runtime data continues under `data/runtime` through `runtimePath`; it is not committed.
- Existing secret redaction is applied before any efficiency event, report, compact summary, or checkpoint is persisted.
- Capability and Skill Promotion gates retain their decisions. Efficiency records advisory evidence beside those decisions.

This design implements Articles II, III, VI, VII, IX, and X of the Engineering Constitution: evidence is traceable, inference is labeled, providers remain replaceable, recommendations are explainable, external context is minimized, and the implementation reuses existing primitives.

## Configuration and Feature Flags

A focused configuration loader reads environment variables and returns an immutable validated policy. Invalid optional values fall back to safe defaults and produce a configuration warning in observation output rather than breaking startup.

The top-level flag is `MUNIN_TOKEN_EFFICIENCY_ENABLED`. Its default is `0`. When disabled, integrations return without writing efficiency observations. Enabling it activates observation only.

Individual flags:

- `MUNIN_TOKEN_EFFICIENCY_TELEMETRY_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_ROUTER_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_BUDGET_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_COMPACTION_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_CHECKPOINT_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_REPORT_ENABLED`
- `MUNIN_TOKEN_EFFICIENCY_PROMOTION_OBSERVATION_ENABLED`

Threshold variables accept positive integer token counts:

- `MUNIN_TOKEN_TASK_WARNING_TOKENS`
- `MUNIN_TOKEN_TASK_CRITICAL_TOKENS`
- `MUNIN_TOKEN_SESSION_WARNING_TOKENS`
- `MUNIN_TOKEN_SESSION_CRITICAL_TOKENS`
- `MUNIN_TOKEN_FRESH_SESSION_TOKENS`

The ordering invariant is `warning < critical <= fresh-session` for session values and `warning < critical` for task values. The loader falls back to documented defaults as one complete policy when an override violates an invariant. A caller can inject a policy in tests without changing process environment.

## Observation Model

### Usage samples

Each sample is associated with a run and may also carry task, agent, provider, model, and session identifiers. It records:

- input, output, cached-input, reasoning, and total tokens when available;
- estimated input and output tokens when exact values are absent;
- monetary cost when reported or computable from an explicitly configured zero-or-known price table;
- source quality: `measured`, `provider_reported`, `estimated`, or `unavailable`;
- context bytes and message/item counts where the execution seam exposes them;
- timestamp and optional duration.

The system never invents a dollar cost for an unknown model. Such cost remains unavailable. Token estimation uses a deterministic local heuristic and is always labeled `estimated`.

### Events

The existing telemetry union gains efficiency events for usage observation, tier recommendation, budget warning, compaction, checkpoint creation, and report generation. Event metadata is structured and bounded. It excludes raw context and prompt bodies.

### Persistence

Fine-grained observations use the existing JSONL sink. Materialized reports and checkpoints use bounded JSON files under the runtime directory. Writes are best-effort, serialized, and recoverable. Malformed or missing historical lines are skipped and counted in report quality metadata rather than crashing report generation.

## Cost-Aware Model Router

The router is a pure deterministic classifier. It consumes a bounded task descriptor containing work type, requested capabilities, risk indicators, verification requirements, context estimate, and whether local tools can satisfy the request.

It produces:

- classification: `mechanical`, `bounded_reasoning`, `complex_reasoning`, or `high_stakes`;
- recommended tier: `deterministic_local`, `local_model`, or `strong_model`;
- optional provider/model recommendation only when it exists in injected available profiles;
- confidence and reason codes;
- the actual executor/provider identifiers, if known, solely for later comparison.

The recommendation policy prefers deterministic or local execution for repeatable transformations, file inspection, test execution, polling, formatting, and low-risk extraction. It recommends a strong model for ambiguous architecture, novel diagnosis, safety-critical review, high-stakes decisions, or synthesis across conflicting evidence. Explicit risk and verification needs can raise but never lower the tier.

No router API returns an executable provider object. This type-level separation prevents shadow recommendations from becoming accidental routing.

## Context Budgets

Budget evaluation is a pure function over a policy and accumulated usage. It returns:

- `healthy` below the warning threshold;
- `warning` at or above warning;
- `critical` at or above critical;
- `checkpoint_recommended` at or above the fresh-session threshold.

It also returns percentage used, threshold crossed, and a human-readable reason. Observation-mode integration emits warnings but does not throw, truncate, stop, reroute, or mutate task context.

Task usage is scoped by task ID when available and otherwise by the agent execution span. Session usage is scoped by an explicit session ID and otherwise by run ID. Missing token data yields `unavailable`, never a guessed healthy state.

## Structured Compaction

The compact representation is a typed artifact rather than free-form prose. It contains:

- objective and current status;
- confirmed decisions with evidence references;
- unresolved questions and blockers;
- errors and attempted recoveries;
- artifacts with stable identifiers or paths;
- completed work;
- next steps in priority order;
- verification state;
- source coverage and omissions;
- usage snapshot and recommendation metadata.

Compaction is deterministic for structured orchestration records. Text fields are bounded, deduplicated, and redacted. Errors, blockers, decisions, artifacts, and verification failures have preservation priority over commentary and repetitive progress. The result reports original and compacted sizes and the estimated token reduction. V1 creates the artifact but does not replace live context with it.

## Fresh-session Checkpoint and Handoff

When requested explicitly or recommended by the session budget, Munin can materialize a checkpoint containing the structured compact artifact plus run/session identifiers, creation time, repository/branch state when supplied, next action, and a continuation prompt. The prompt states that it is a handoff summary and retains evidence-quality labels.

Checkpoint creation is idempotent for the same run, session, and source revision. It produces a new revision only when the source material changes. It never launches a session, invokes a model, or archives the source session.

## Savings Report

The report aggregates a bounded observation window and separates three columns conceptually:

- actual: provider-reported tokens and cost;
- estimated baseline: token/cost estimates where actual values are absent;
- counterfactual: estimated usage if the router recommendation and compact checkpoint had been followed.

Savings are reported as token counts and percentages. Dollar savings appear only when both sides have a known cost basis. Every report includes sample counts, coverage ratios, estimation methodology, and confidence (`low`, `medium`, or `high`). Before/after comparison can use explicit baseline and observation windows; without a true after window the report calls the result `projected`, not `observed`.

## Supervisor, Worker, and Promotion Gate Integration

### Orchestrator and agents

The observability wrapper records the router recommendation and budget state before an agent executor runs, then records usage supplied by its result or context after completion. Existing `AgentExecutionResult` behavior remains compatible; optional usage metadata can be added without requiring existing executors to change.

### Host Worker and supervisor

Workers may record task/session identifiers, durations, context size, and provider usage when available. The workspace supervisor exposes only aggregate efficiency health in its runtime state: enabled state, last observation time, latest threshold state, and latest report path. These additions do not alter restart or ownership behavior.

### Skill Promotion Gate

Promotion evaluation records an advisory efficiency observation containing estimated context size, recommended tier, expected zero-cost compatibility, and whether evidence is sufficient. Existing promotion and hold decisions are returned unchanged. The observation cannot raise a candidate's score or bypass security, duplication, evidence, licensing, maintenance, rollback, or zero-cost checks.

## Failure Handling and Privacy

- All efficiency instrumentation is fail-open with respect to productive execution and fail-closed with respect to persistence of unsafe data.
- Redaction occurs before enqueueing a durable write.
- Oversized fields are truncated with an explicit truncation marker and original size.
- Invalid historical telemetry is counted and skipped.
- Unknown providers/models remain `unknown`; they are not mapped heuristically to a paid tier.
- Disabled flags cause no efficiency filesystem writes.
- Reports contain identifiers and aggregate metrics, not prompt or response bodies.

## Testing Strategy

Development follows red-green-refactor. Focused tests cover:

- configuration defaults, overrides, invalid values, and threshold invariants;
- exact versus estimated usage and unavailable cost handling;
- router classification, risk escalation, profile availability, and proof that it cannot select an executor;
- task/session threshold boundaries and missing usage;
- compaction preservation, prioritization, redaction, deduplication, and size accounting;
- checkpoint idempotency and source-revision changes;
- report aggregation, malformed telemetry, coverage, confidence, and observed-versus-projected labels;
- orchestrator event integration without behavior changes;
- supervisor and worker observation behavior;
- Promotion Gate decision equivalence with observation enabled and disabled;
- feature-disabled regression proving no new writes or altered results;
- Windows-safe paths and line-oriented persistence.

Verification requires the focused tests, TypeScript build, web build, full `npm test`, a repository secret scan using existing tooling or a bounded pattern scan, and final diff/governance review.

## Rollout and Activation Boundary

V1 ships disabled by default. Observation is activated by setting the top-level feature flag, optionally followed by individual flags and thresholds. Rollback is clearing the flag; no schema migration or external service removal is required.

Real routing remains a separate version and requires all of the following:

1. An enforcement-specific ADR and configuration mode distinct from shadow mode.
2. A typed adapter between recommendation and `ProviderRegistry.select`, with explicit allowlists and deterministic fallback.
3. Provider/model availability and capability checks at execution time.
4. Minimum observation coverage and accuracy thresholds established from v1 data.
5. Quality parity benchmarks by task class, including strong-model escalation tests.
6. Cost and context limits that can block or reroute safely rather than merely warn.
7. Human approval for high-stakes or externally billed execution.
8. Canary rollout, rollback criteria, and audit evidence proving executor changes.
9. Updated Promotion Gate and security review approving enforcement behavior.

Until those conditions are implemented and approved, no Token Efficiency component may alter execution selection.

## Definition of Done

- All nine requested capabilities exist in shadow mode behind safe flags.
- Existing executor/provider outcomes are byte-for-byte or structurally equivalent with the feature disabled and behaviorally equivalent when observation is enabled.
- Exact and estimated metrics are distinguishable throughout the pipeline.
- Compact artifacts preserve decisions, errors, evidence, artifacts, verification state, blockers, and next steps.
- A checkpoint can be used to continue a long workflow without raw history.
- The report quantifies coverage and projected savings without overstating evidence.
- Supervisor, workers, and Promotion Gate expose observations without decision changes.
- Focused and complete test suites pass on the available Windows environment.
- Documentation, changelog, operational state, and SITREP agree with the implementation.
