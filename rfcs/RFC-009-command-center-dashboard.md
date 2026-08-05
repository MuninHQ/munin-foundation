# RFC-009: Command Center dashboard

## Status

Accepted for implementation.

## Context

Munin now stores projects, decisions, actions, opportunities, research, relations and events. Operators still need separate commands to inspect each domain, which increases context-switching and makes urgent cross-domain work easy to miss.

## Decision

Add a deterministic, read-only Command Center report generated from the current state and event log.

The report includes:

- system health;
- executive counts;
- cross-domain hotspots;
- dated operational agenda;
- active projects;
- urgent career items;
- open research;
- recent activity.

Health is explainable and uses visible rules. It becomes `ATTENTION` when there are graph blockers, more than three pending decisions or more than three overdue career follow-ups. It becomes `ACTIVE` when meaningful work exists without those conditions, otherwise `STABLE`.

## Commands

```text
munin dashboard
munin command-center
```

Both commands produce the same read-only output.

## Constraints

- No autonomous mutation or execution.
- No hidden machine-learning ranking.
- No external services.
- No private data added to the public repository.
- Output must remain deterministic for a fixed state, event log and timestamp.

## Acceptance criteria

- All existing domain data is represented in one report.
- Overdue follow-ups, graph blockers, unsynthesized research and overdue actions appear as alerts.
- Dated actions and follow-ups appear in the agenda.
- Empty state renders safely.
- Automated tests cover alerting and empty-state behavior.
