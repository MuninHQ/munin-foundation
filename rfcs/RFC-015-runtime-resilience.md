# RFC-015: Runtime Resilience

## Status

Accepted for M9.5 implementation.

## Context

Provider routing and quality gates protect selection and output quality, but execution still needs explicit controls for transient failures, hanging calls and repeated provider outages.

## Decision

Wrap providers with a transport-neutral resilience adapter that provides:

- bounded attempts;
- per-attempt timeout;
- appendable attempt metadata;
- circuit breaker state per provider;
- automatic circuit reset window;
- safe propagation of the final failure.

The default provider is wrapped by this adapter. Custom providers may opt into the same boundary without changing the execution engine.

## Attempt audit

Successful responses include attempt count, attempt outcomes, durations and circuit state in provider metadata. Failed executions preserve the attempt list on the thrown error for diagnostics and future telemetry integration.

## Safety

Retries are bounded. An open circuit prevents additional provider calls until its reset window expires. The adapter does not retry policy rejection or quality-gate rejection because those failures are not transport failures.

## Non-goals

- distributed circuit state;
- persistent circuit state across process restarts;
- exponential backoff;
- provider-specific error classification;
- enabling external providers.

## Acceptance criteria

- transient failure can recover within the configured attempt limit;
- slow providers are terminated by timeout from the runtime perspective;
- repeated failures open a circuit;
- open circuits stop new provider calls;
- attempt data is available in provider metadata;
- all existing tests and Markdown checks pass.
