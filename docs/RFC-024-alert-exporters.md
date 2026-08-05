# RFC-024: Alert Exporters

## Status

Implemented.

## Context

Outbox observability can classify health and explain alerts locally, but operators still need a stable boundary for delivering those alerts to external channels. Direct Slack, email or webhook code inside the health analyzer would couple operational logic to vendors and make repeated polling noisy.

## Decision

Introduce a transport-neutral `AlertExporter` contract and an `AlertDispatcher` that converts outbox metrics into structured events.

Events include source, kind, severity, title, details, fingerprint, timestamp and selected metrics. The dispatcher persists the last fingerprint and health state in `alert-state.json`.

## Behavior

- Initially healthy state produces no notification.
- Non-healthy state produces an incident event.
- Repeated identical incidents are suppressed.
- Material changes produce a new fingerprint and a new event.
- Returning from degraded or critical to healthy produces one recovery event.
- Exporters are invoked sequentially and identified in the dispatch result.

## Safety properties

- Core health analysis remains independent of delivery channels.
- Deduplication survives process restarts.
- Recovery is explicit rather than inferred by silence.
- Event payloads are deterministic for the same health state.
- No network client or secret is embedded in the core.

## Scope

This increment defines the event and exporter boundary. Concrete Slack, email and webhook implementations, delivery retries and exporter-specific credentials remain separate adapters.

## Acceptance criteria

- Healthy state is silent by default.
- Incidents are structured and exportable.
- Identical incidents are deduplicated.
- Changed incidents are delivered.
- Recovery is delivered once.
- State is persisted locally.
