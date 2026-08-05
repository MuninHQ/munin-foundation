# RFC-013: Provider Registry and Policy Engine

## Status

Accepted for implementation.

## Context

M9.2 introduced a provider-neutral execution boundary and quality gate. A runtime with more than one provider also needs an explicit, auditable routing policy. Provider selection must not depend on hidden ordering or silently enable external execution.

## Decision

Munin will use a provider registry with declarative profiles and a deterministic policy engine.

Each profile declares:

- provider identifier;
- supported capabilities;
- offline or external mode;
- estimated cost per call;
- estimated latency;
- enabled state.

Each policy may declare:

- offline-only operation;
- maximum cost per call;
- maximum latency;
- ordered provider preferences.

The policy engine returns both the selected provider and a decision record containing considered providers, rejected providers, rejection reasons and selection rationale.

## Safety defaults

- Offline-only is the CLI default.
- External placeholders remain disabled.
- The registry stores no secrets.
- Selection does not execute a provider.
- A provider that fails any policy constraint is not eligible.

## CLI

```text
provider-policy list
provider-policy evaluate <capability>
provider-policy evaluate research --allow-external --max-cost=0.05 --max-latency=2000
```

## Consequences

Provider routing becomes explainable and testable. Future provider adapters can be introduced without changing task contracts or quality gates. Integrating registry selection directly into the execution loop remains a separate increment so that this policy boundary can stabilize independently.

## Acceptance criteria

- Offline policy rejects external providers.
- Cost and latency limits are enforced.
- Preferred providers win only when eligible.
- Disabled and unsupported providers are reported.
- Fallback selection is deterministic.
- CI and Markdown checks pass.
