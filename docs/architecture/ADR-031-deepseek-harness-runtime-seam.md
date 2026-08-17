# ADR-031 — DeepSeek Harness as reference, native capability seam as PoC

- Status: Experimental
- Date: 2026-08-17
- Issue: #180

## Context

DeepSeek Harness (`dsh`) is an official DeepSeek AI open-source agent harness built on Cordis. Its architecture makes model adapters, tools, session logging and the agent loop replaceable plugins. It also separates durable session events from live interception events and models swappable capabilities as definition/provider/consumer seams.

Munin already has a local-first provider policy, execution plans, autonomous goals, review gates, outbox/leases/fencing/recovery primitives and governed Context Memory. Replacing these with dsh would discard useful safety and product-specific contracts. Importing Cordis directly would also couple Munin core to a developer-preview framework whose upstream explicitly warns of compatibility-breaking changes.

## Decision

1. **Do not adopt DeepSeek Harness or Cordis as a Munin core dependency at this stage.**
2. **Keep** Munin's provider policy, governed memory, execution records, outbox/leases/fencing and product layer.
3. **Adapt** the DSH capability-seam pattern as a native, framework-independent experimental registry.
4. The experimental seam must support reversible registration, deterministic interceptors and an audit trace.
5. It must remain outside the production `ExecutionEngine` path until benchmarked on a real capability.
6. Any future DSH/Cordis integration must sit behind this or an equivalent adapter so removal does not change Munin product contracts.

## First proof: Browser Operator

The existing Browser Operator is now exposed experimentally as `browser.operator` through the seam. The first proof intentionally permits only the non-destructive `health` action. A `before` interceptor named `browser-policy-gate` rejects every unapproved action before the backend can execute.

This demonstrates the important DSH-derived properties without changing production execution: removable registration, policy-before-side-effect ordering, backend portability across Playwright CLI / Browser Use, and per-execution trace generation. Navigation, forms, downloads and uploads remain blocked until their existing benchmark proves action logging, replay and deterministic permission gating.

## Consequences

### Positive

- Munin gains a composable extension point without adding runtime or paid dependencies.
- Browser, MCP, shell and subagent experiments can share one registration/interception shape.
- Upstream DSH churn cannot break Munin core.
- Existing safety gates remain authoritative.
- The Browser Operator proof shows an existing module can be adapted without rewriting its implementation.

### Negative

- Munin temporarily maintains a small amount of native infrastructure rather than using Cordis directly.
- We do not automatically inherit the broader DSH plugin ecosystem.
- A second decision will be required after representative benchmark evidence.

## Rejected alternatives

### Replace Munin runtime with DeepSeek Harness

Rejected because Munin already owns safety, memory, provider-policy and product-realm contracts that are not equivalent to dsh session/runtime behavior.

### Add Cordis immediately

Rejected because the measurable benefit has not yet been demonstrated and upstream is in developer preview.

### Ignore DeepSeek Harness entirely

Rejected because its capability-seam, event interception and reversible-composition patterns directly address Munin's current need to turn the foundation runtime into an extensible product execution layer.

## Validation / exit criteria

This ADR may move to **Accepted** when the representative capability evidence demonstrates lower coupling with no regression in correctness, recoverability, traceability, local resource use, provider portability or safety policy, and the full project test suite is green.

It should move to **Rejected** if the native seam duplicates existing registries without making real integrations materially simpler.
