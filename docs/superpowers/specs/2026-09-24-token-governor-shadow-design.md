# Munin Token Governor Shadow Mode Design

## Intent

Add a zero-cost, local-first Token Governor that measures avoidable context volume and recommends cheaper model/effort routes without changing provider selection, model selection, reasoning effort, task execution, or skill promotion. The first release is observation-only and must produce evidence suitable for a later promotion decision.

## Success criteria

- Large tool and terminal outputs can be deterministically reduced to a bounded summary that preserves the beginning, end, and diagnostically relevant lines.
- Every observation records estimated input size, observed size, retained size, estimated tokens, and estimated savings using a transparent local heuristic.
- Routing advice is conservative and names a recommended model tier and reasoning effort, but the actual `ProviderRegistry` decision remains authoritative and unchanged.
- Telemetry is secret-redacted before durable persistence and can be summarized into measured savings and recommendation counts.
- The feature defaults to shadow/observation mode, has no paid or new runtime dependency, and cannot automatically promote or execute candidate skills.
- Existing provider, orchestration, safety, and Skill Promotion Gate behavior remains compatible and covered by regression tests.

## Non-goals

- No automatic provider/model/effort switching.
- No LLM-generated summaries, semantic embeddings, or external compression service.
- No replacement of complete canonical task results with compressed text in durable business state.
- No automatic skill creation, execution, or promotion.
- No claim of realized billing savings; shadow telemetry reports estimated avoidable context tokens only.

## Recommended architecture

Use a native deterministic module integrated at the orchestration boundary. This fits Munin's zero-cost and local-first constraints and avoids introducing Headroom, RTK, WSL, or another framework as a required dependency.

Two alternatives were rejected for shadow v1:

1. Provider-specific middleware would capture exact tokenizer data but would duplicate logic per provider and could accidentally alter execution.
2. An external compression service could produce higher-quality summaries but would add cost, privacy, availability, and vendor-lock-in risks.

## Components

### Token Governor core

A focused module owns:

- deterministic token estimation from Unicode text;
- classification of tool/terminal/provider output;
- bounded summarization of outputs above a configured threshold;
- routing recommendations based on input size, task capability, risk, complexity, and existing policy signals;
- immutable observation records tagged `mode: "shadow"` and `applied: false`.

The summarizer preserves:

- a bounded prefix for context;
- lines matching failure, warning, stack, diff, test-summary, exit-code, and diagnostic markers;
- a bounded suffix for final status;
- explicit omission counts and original/retained estimates.

For outputs below the threshold, the observation records zero savings and returns the original text unchanged.

### Durable telemetry

An append-only JSONL store follows the existing orchestration trace pattern. Records are redacted with the existing secret-redaction utility before writing. Aggregation reports:

- observations and oversized observations;
- estimated original, retained, and saved tokens;
- estimated savings ratio;
- recommendation counts by model tier and effort;
- applied changes, which must remain zero in shadow mode.

Malformed or absent telemetry files fail safely for reads and never block task execution.

### Provider Registry and Policy integration

`ProviderRegistry.select()` remains unchanged as the authority for actual routing. At orchestration execution time, Munin asks the Governor for advice using the same request and selected provider decision, then attaches the recommendation and token observation to trace/telemetry metadata. Advice may explain that a cheaper/economy path appears sufficient or that a higher tier may be justified, but `selectedProviderId` is never mutated.

Existing `model-router` concepts are reused for tier language where practical. Reasoning effort recommendations are conservative:

- `low` by default;
- `medium` only for clearly complex, multi-tool, or high-impact work;
- `high` only when multiple strong complexity/risk signals coincide;
- never a recommendation above `high` in shadow v1.

### Output integration

Provider/tool output is observed after execution. The full result continues through existing quality gates and durable task state. A compressed context view is generated only as telemetry/reusable context metadata for downstream consumers that explicitly opt in later. Shadow v1 does not substitute the compressed view into provider requests.

This separation makes the savings estimate honest: it represents instrumented potential savings, not realized savings.

### Skill Promotion Gate

The Governor accepts only text and routing metadata. It has no API for skill discovery, loading, execution, or promotion. Any text mentioning a candidate skill remains inert data. Tests explicitly assert that observations always record `applied: false` and no promotion/execution authority is exposed.

## Configuration

Defaults are code-owned and deterministic. Optional environment values may tune observation thresholds and retained output size, with invalid values falling back to safe defaults. No flag can enable automatic routing or promotion in this release.

## Data flow

1. The orchestrator constructs its normal provider request.
2. `ProviderRegistry` selects the actual provider under current policy.
3. The Governor records request-size telemetry and a non-binding route/effort recommendation.
4. The selected provider executes normally.
5. The Governor observes and summarizes the returned output for telemetry only.
6. Existing review and task persistence use the original output.
7. A redacted append-only observation is stored and can be aggregated for SITREP evidence.

## Failure behavior

- Governor exceptions are contained and must not change provider execution outcome.
- Empty output produces a valid zero-token observation.
- Invalid thresholds fall back to defaults.
- Secret-shaped content is redacted before persistence.
- Extremely long single lines are bounded without unbounded regular-expression work.
- Telemetry write failure is observable but does not fail the governed task in shadow mode.

## Test strategy

- Unit tests for token estimation boundaries and deterministic summarization.
- Unit tests for diagnostic retention, bounded single-line input, empty/small input, and secret redaction.
- Unit tests proving route recommendations are conservative and non-binding.
- Store/aggregation tests proving savings math and `appliedChanges === 0`.
- Integration tests proving Provider Registry selection and original task output are unchanged when the Governor observes them.
- Regression coverage for existing provider-policy, model-router, orchestration trace, promotion-gate, build, and full repository tests.

## Promotion evidence required

Promotion out of shadow mode requires all of the following:

- a representative observation window with enough real tool/terminal outputs to avoid fixture-only conclusions;
- materially positive estimated savings with no secret leakage;
- a reviewed sample showing summaries retain every failure and terminal-status line needed for diagnosis;
- no regression in task quality, completion, provider policy, or safety gates;
- an explicit human-approved policy defining which downstream context consumers may use compressed views;
- provider-specific tokenizer calibration if claimed savings will be presented as billing-grade rather than heuristic;
- explicit approval for any automatic model/effort routing change;
- continued separate human review through the existing Skill Promotion Gate for every candidate skill.
