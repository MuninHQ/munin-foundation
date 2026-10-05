# Scheduled Task Migration

The schedules below are intentionally staggered to reduce collisions and free-tier quota spikes. Cron expressions are five-field format.

Before enabling, confirm the Antigravity project's timezone matches the desired local timezone.

## Daily briefing — every day 08:00

```text
/schedule "0 8 * * *" Use the daily-briefing skill. Read private preferences and prior deduplication state only from data/runtime/succession. Produce today's five highest-value items with validated current web/YouTube sources, practical Munin opportunities, and up to two professional-content angles. Persist only local non-sensitive deduplication state. Do not modify Munin code unless you explicitly hand off a qualified improvement to munin-build-all.
```

## Regulatory radar — every day 08:10

```text
/schedule "10 8 * * *" Use the regulatory-radar skill. Check configured official sources, compare against local prior state, and report only a new material validated change. If nothing material changed, produce no alert. Keep all comparison state under data/runtime/succession and never commit private context.
```

## Career radar — weekdays 08:20

```text
/schedule "20 8 * * 1-5" Use the career-radar skill. Search current high-fit roles using the private local profile, deduplicate against local seen/applied state, re-surface a genuinely reopened role as REOPENED/REAPPEARED, and return only evidence-backed APPLY NOW / REVIEW / SKIP results. Never apply or message anyone automatically.
```

## LinkedIn weekly review — Friday 15:00

```text
/schedule "0 15 * * 5" Use the linkedin-weekly-review skill with the authorized analytics source. Compare the last week's post performance, separate facts from inference, recommend concrete adjustments, and propose three next-week topics. Do not publish or schedule posts automatically.
```

## Failure behavior

For every recurring task:

- if source access fails, record the source failure and do not fabricate;
- if quota is unavailable, write a local continuation/handoff state and stop;
- if private context is missing, identify the missing local file and do not substitute public repository guesses;
- if an external action would be consequential, stop at the existing Munin approval boundary.
