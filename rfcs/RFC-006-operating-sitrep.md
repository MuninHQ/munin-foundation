# RFC-006 — Operating SITREP

## Status

Implemented.

## Problem

The original SITREP showed recent state but did not answer two operational questions reliably:

1. What changed after a known review point?
2. Which action should be executed first?

## Decision

Munin will support an optional ISO timestamp for incremental SITREP generation and will rank open actions with a deterministic score.

The score uses:

- declared priority;
- active status;
- overdue or near-term due dates;
- incoming `blocks` relations;
- outgoing `depends_on` relations.

The report also projects typed `blocks` relations into the blockers section.

## Command

```bash
munin sitrep --since 2026-08-05T12:00:00-03:00
```

Without `--since`, the report retains the previous behavior of showing the last ten events.

## Constraints

- Scoring is deterministic and explainable.
- No machine-learning ranking is introduced.
- The score guides attention; it does not execute actions automatically.
- Existing state files remain compatible.

## Acceptance criteria

- Events before the supplied timestamp are excluded.
- A graph-blocked action ranks above an otherwise equal action.
- Typed blockers appear in the blockers section.
- Invalid timestamps fail with a clear usage message.
- Existing SITREP and context tests continue to pass.
