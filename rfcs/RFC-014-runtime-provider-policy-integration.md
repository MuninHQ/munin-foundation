# RFC-014 — Runtime Provider Policy Integration

## Status

Accepted for implementation.

## Context

M9.2 introduced a provider-neutral execution boundary and quality gate. M9.3 introduced provider profiles and a deterministic policy engine. Until this increment, the execution loop still used one provider directly, so policy evaluation did not govern real task execution.

## Decision

Every runtime task must build a structured provider request and pass it to `ProviderRegistry.select` before execution.

The runtime persists the complete routing decision on the task:

- selected provider;
- providers considered;
- rejected providers and reasons;
- routing rationale.

The default runtime policy is offline-only. The default registry contains the deterministic local provider. Additional profiles and policies may be injected explicitly.

## Failure behavior

When no provider satisfies policy:

- the current task becomes `FAILED`;
- the auditable failed selection decision is persisted;
- dependent tasks become `BLOCKED`;
- no provider executes;
- telemetry increments provider-policy rejections.

Provider execution errors and quality-gate failures remain separate failure classes.

## Fallback behavior

Preferred providers are evaluated first, but preference never overrides eligibility. If a preferred provider violates capability, mode, cost, latency or enabled-state constraints, the registry records the rejection and evaluates the next candidate.

## Compatibility

Existing runtime state remains readable because new routing fields are optional. Existing CLI commands continue to work without configuration and use the safe offline default.

## Non-goals

This increment does not:

- store provider secrets;
- call hosted AI services;
- retry failed provider calls;
- dynamically mutate policies during a running plan;
- grant providers external side effects.

## Acceptance criteria

- Every executed task has an auditable provider decision.
- Preferred eligible providers are selected deterministically.
- Ineligible preferred providers fall back safely.
- No-provider conditions fail safely and block dependencies.
- Provider-policy rejection telemetry is available.
- Existing tests and Markdown checks pass.
