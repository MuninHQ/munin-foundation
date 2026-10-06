# Scheduled Task Migration

The successor schedules are deliberately staggered to reduce free-tier quota collisions.

## Windows durability rule

For unattended Windows operation, do **not** rely on Antigravity CLI `/schedule` from a headless one-shot process. In CLI 1.2.17 the daemon job belongs to the CLI process and is terminated when that process exits.

Use Windows Task Scheduler to invoke a local gitignored runner which calls `agy -p`, persists output/receipts, and syncs only non-sensitive local state.

Keep prompts and receipts under:

`data/runtime/succession/`

Never commit the populated private context, provider keys, raw account analytics, or runtime receipts.

## Recommended schedule

| Workflow | Schedule |
| --- | --- |
| Daily briefing | Daily 08:00 |
| Regulatory radar | Daily 08:10 |
| Career radar | Monday-Friday 08:20 |
| LinkedIn weekly review | Friday 15:00 |

On Windows use the local timezone and enable `StartWhenAvailable`. Avoid overlapping instances.

## Prompt contracts

### Daily briefing

Use the `daily-briefing` skill in unattended read-only mode. Target five qualified items, but treat 1-4 evidence-backed items as a healthy degraded result when the evidence bar cannot support five. Never fabricate filler. Keep browser actuation and code mutation disabled.

### Regulatory radar

Use the `regulatory-radar` skill in unattended read-only mode. Prefer primary official sources and report only new material validated change. No change is a valid result.

### Career radar

Use the `career-radar` skill in unattended read-only mode. Never apply or message anyone automatically.

When the primary free operator hits quota, a reviewed zero-cost fallback may use:

```text
structured public ATS/API evidence
  -> deterministic prefilter
  -> optional FreeLLMAPI refinement
  -> governed APPLY NOW / REVIEW / SKIP output
```

The deterministic path must remain usable if the external model returns malformed output.

### LinkedIn weekly review

Use the `linkedin-weekly-review` skill only when an authorized analytics source is available. If the source is unavailable, record the evidence gap instead of inventing metrics. Never publish automatically.

## Permission boundary

Unattended tasks should be narrower than an interactive BUILD ALL session.

Recommended principles:

- allow read-only web retrieval;
- deny browser actuation such as form submission/click execution;
- allow writes only under `data/runtime/succession/`;
- deny Git mutation and protected paths;
- keep external publication/application/messaging behind explicit approval.

## Failure behavior

For every recurring task:

- if source access fails, record the source failure and do not fabricate;
- if primary model quota is unavailable, use only an explicitly reviewed zero-cost fallback;
- if that fallback is unavailable, persist a durable handoff and stop;
- if private context is missing, identify the missing local file and do not substitute public repository guesses;
- if an external action would be consequential, stop at the existing Munin approval boundary.
