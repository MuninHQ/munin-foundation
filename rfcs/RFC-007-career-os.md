# RFC-007 — Career Operating System

## Status

Accepted for M5 implementation.

## Problem

A list of job opportunities does not indicate where attention is required. Career operations need an explicit queue that combines fit, pipeline stage, follow-up timing and inactivity without hiding the ranking logic.

## Decision

Munin will maintain an explainable Career Queue. Each opportunity receives a deterministic priority score from:

- profile fit;
- active pipeline stage;
- overdue follow-up;
- days without an update;
- terminal status.

The score is accompanied by human-readable rationale. It is a workflow prioritization signal, not a prediction of hiring success.

## Operations

- `career sitrep` renders pipeline totals and the prioritized queue.
- `career queue` returns machine-readable queue items.
- `job touch` records contact and schedules a seven-day follow-up.
- `job close` records a terminal outcome and removes pending follow-up.

## Trust controls

- Ranking rules are visible in code and output.
- Terminal opportunities remain auditable rather than being deleted.
- Contact events and closure reasons are appended to the event log.
- Sensitive career records remain in the local runtime store, not in the public example data.

## Non-goals

- Automatic applications.
- Email sending.
- Scraping job boards.
- Predicting recruiter decisions.
- Replacing human judgment on compensation or role quality.

## Acceptance criteria

1. Follow-ups due are explicitly visible.
2. Interview and applied stages affect queue priority.
3. Contact updates create a new follow-up date.
4. Closed opportunities stop generating follow-up work.
5. Tests cover prioritization and lifecycle changes.
