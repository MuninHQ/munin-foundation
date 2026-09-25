# Munin Viral Engine v1

## Position

The Viral Engine is the governed orchestration and learning layer for content opportunities. It does not replace YT-LAB, Content Studio, MoneyPrinterTurbo, Pexels, or Agent Forge. It ranks work, prepares an evidence-backed handoff, records outcomes, and recommends the next controlled experiment.

It remains isolated under `data/runtime/viral-engine/state.json`; the Munin core state and the YT-LAB project files are not mutated.

## Closed loop

`Trend Discovery → Opportunity Score → Content Architecture → Production Handoff → Manual Publishing → Analytics → Learning`

| Role | Contract | Persistent output |
| --- | --- | --- |
| Raven | Ingest trusted-radar or human signals without fabricating metrics | Deduplicated `ViralSignal` |
| Loki | Apply the documented YT-LAB weighted model and hard-risk gates | Ranked `ViralTopic` with reasons |
| Skald | Require reviewed sources, claims, fact check, and an original angle | Architecture and packaging hypotheses |
| Forge | Require explicit production approval and prepare the local Content Studio handoff | Idempotent production job |
| Odin | Compare outcome metrics and change one primary variable at a time | Bottleneck, decision, and next test |

All role transitions are also emitted to the existing Agent Forge telemetry stream with zero recorded inference cost.

## Score

Positive weights follow the YT-LAB model: evergreen 20, demand 20, series depth 15, differentiation 15, evidence 10, and advertiser value 10. Penalties are copyright risk 15, production effort 10, and factual risk 5. Inputs are bounded to 0–5 and the net result is normalized to 0–100.

Copyright or factual risk at 4 or 5 always produces `REJECT`, independent of the total.

## Governance

- Core behavior has no paid provider dependency.
- Discovery reuses the existing Trusted Source Radar; manual and YouTube/Pexels observations can also be recorded.
- Production creates a local `media.content-video` plan handoff. It does not invoke paid services or publish.
- Evidence and explicit production approval are mandatory before a job is queued.
- Publication is only recorded after the user confirms that it occurred manually and that render, packaging, description, and asset licenses were reviewed.
- Analytics are never inferred. Odin operates only on supplied measurements and marks small samples as insufficient.

## API

- `GET /api/viral-engine`
- `POST /api/viral-engine/discover`
- `POST /api/viral-engine/signals`
- `POST /api/viral-engine/topics/:id/evidence`
- `POST /api/viral-engine/topics/:id/produce`
- `POST /api/viral-engine/topics/:id/published`
- `POST /api/viral-engine/topics/:id/metrics`

The operator surface is `/viral-engine.html` and is included in the shared desktop navigation.

