# ADR-0006 — ChatGPT-first operator mode

## Status

Accepted — 2026-08-20

## Context

Munin's local AI path used Ollama as an automatically discovered fallback and could probe, start and wait for a local model service. On the target Windows host this created material latency and resource contention, while the product's durable value already lives in its control plane, memory, deterministic services, connectors and governed actions.

The current phase prioritizes a usable Munin with no additional paid AI dependency. A ChatGPT subscription is not treated as an API credential and Munin must not require OpenAI API billing to run its default workflows.

## Decision

Munin adopts a ChatGPT-first operator model for the current phase:

`User ↔ ChatGPT cockpit → Munin control surfaces/connectors/repository → deterministic services, state and actions`

- ChatGPT is the primary interactive intelligence/operator cockpit.
- Munin's default runtime does not require an in-process LLM provider.
- Ollama remains supported only as an explicitly enabled optional provider using `MUNIN_OLLAMA_ENABLED=1`.
- Munin must not probe, start or wait for Ollama unless that opt-in is present.
- Automatic Ollama service startup requires an additional explicit `MUNIN_OLLAMA_SELF_HEAL=1` opt-in.
- Provider-neutral seams remain intact for future local or external providers.
- No OpenAI API key, paid token balance or other paid AI service is required by the default configuration.
- Capabilities that genuinely require model inference expose an `External intelligence required` boundary when no optional in-process provider is configured.
- Deterministic capabilities continue without local inference.
- Offline/AI-independent operation remains a future portability option, not a current MVP requirement.

## Consequences

- Normal startup and deterministic use no longer touch Ollama, reducing host resource contention and surprise latency.
- Local autonomous inference is unavailable until deliberately enabled.
- ChatGPT can operate the project through available connectors and control surfaces, while local-only host actions remain a host/human boundary unless a separately governed bridge is introduced.
- Existing Ollama implementation and provider abstractions are retained, avoiding provider lock-in or destructive rollback work.

## Guardrails

- Do not introduce paid AI runtime dependencies without explicit user approval.
- Do not silently reinterpret ChatGPT subscription access as OpenAI API entitlement.
- Do not make irreversible local actions remotely executable merely to close the cockpit/runtime gap.
- Keep durable Munin state in Munin; ChatGPT conversation history is not the system of record.
