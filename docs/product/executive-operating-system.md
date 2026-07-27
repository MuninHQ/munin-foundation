# Executive Operating System (EOS)

> Canonical operating specification for the North Star executive cockpit.
>
> Status: **Structured**
>
> Owner: **André**
>
> Strategy and governance: **ChatGPT**
>
> Repository implementation and automation: **Claude**
>
> Last updated: **2026-07-27**

## 1. Purpose

The Executive Operating System is the operating layer of North Star OS. It gives André one place to understand priorities, make decisions, direct execution, and review progress across career, products, intellectual production, and personal operating commitments.

EOS is not a separate product and does not replace Munin. North Star governs; Munin may later provide the contextual interface and automation experience.

## 2. Product promise

At any moment, EOS should answer six questions:

1. What matters most now?
2. What changed since the last review?
3. What is blocked or at risk?
4. Which decisions require André?
5. What should be executed next?
6. What evidence shows progress?

## 3. Design principles

1. **P0 first.** Career Operations takes precedence over build work.
2. **One source of truth.** Canonical state lives in versioned project and capability records.
3. **Decision-oriented.** The dashboard must surface decisions, not merely information.
4. **Small operating surface.** EOS begins as structured Markdown and schemas before becoming software.
5. **Explicit ownership.** Every active item has an owner, status, next action, and target date when applicable.
6. **Human approval.** External publication, applications, commitments, and irreversible actions require André's approval.
7. **Evidence over activity.** Progress is measured through accepted deliverables and outcomes, not message volume.

## 4. Core modules

### 4.1 Mission

Shows the current professional mission and a small set of outcomes for the year and quarter.

Minimum fields:

- Mission statement.
- Annual outcomes.
- Current-quarter outcomes.
- Current constraints.
- Explicit non-goals.

### 4.2 Portfolio

Uses `PROJECTS.md` as the canonical initiative register.

Minimum fields per initiative:

- ID or canonical name.
- Priority.
- Status.
- Executive owner.
- Operating owner.
- Objective.
- Next milestone.
- Next action.
- Dependencies.
- Risks.
- Decision required.
- Last meaningful update.

### 4.3 Career Engine

The P0 operating center.

Canonical pipeline:

`Discovery → Fit score → Investigation → Application → Outreach → Interview → Result`

Minimum views:

- High-fit opportunities.
- Applications requiring action.
- Follow-ups due.
- Networking conversations.
- Interview preparation.
- Outcomes and conversion metrics.

### 4.4 Content Engine

References `docs/product/content-engine.md`.

Canonical pipeline:

`Idea → Research → Draft → Review → Approved → Scheduled → Published → Repurposed`

Minimum views:

- Flagship assets.
- Current drafts.
- Items awaiting André's approval.
- Publication calendar.
- Repurposing backlog.
- Qualified outcomes influenced by content.

### 4.5 Munin and AIP Status

Separates product delivery from architecture.

Minimum views:

- Munin v0.1 accepted scope.
- Current implementation milestone.
- Repository health.
- Open architecture decisions.
- AIP components mapped to accepted Munin use cases.
- Scope-expansion warnings.

### 4.6 Executive Review

The daily and weekly operating surface.

It consolidates:

- SITREP.
- INCREP.
- EXECUTE queue.
- Decisions.
- Risks.
- Commitments.
- Results.

## 5. Operating commands

### 5.1 SITREP

Purpose: provide the current state of a project, capability, or the whole portfolio.

Required output:

- Current status.
- Changes since the previous report.
- Completed work.
- Blockers and risks.
- Decisions required.
- Next milestone.
- Owner and target date when applicable.

### 5.2 INCREP

Purpose: report a material event that changes priority, risk, scope, timeline, or operating assumptions.

Required output:

- Event.
- Impact.
- Affected initiatives.
- Immediate containment.
- Decision required.
- Recommended update to the source of truth.

### 5.3 EXECUTE

Purpose: convert an accepted decision into bounded work.

Required input:

- Objective.
- Target artifact or outcome.
- Scope.
- Constraints.
- Owner.
- Acceptance criteria.

Required completion report:

- What changed.
- Files, records, or systems affected.
- Evidence of completion.
- Remaining risks.
- Recommended next action.

## 6. Decision workflow

`Signal → Assessment → Recommendation → André decision → Execution → Evidence → Source-of-truth update`

Decision states:

- Proposed.
- Needs information.
- Approved.
- Rejected.
- Delegated.
- Superseded.
- Completed.

A decision is not complete until its consequence is reflected in the relevant canonical document or system.

## 7. Cadence

### Daily review — 10 to 15 minutes

- P0 opportunities and deadlines.
- Actions due today.
- Blockers.
- Approval queue.
- One principal outcome for the day.

### Weekly operating review — 30 to 45 minutes

- Portfolio SITREP.
- Career funnel and upcoming conversations.
- Content pipeline.
- Munin and AIP delivery.
- Risks and decisions.
- Commitments for the next seven days.

### Monthly portfolio review

- Priority changes.
- Projects to pause, archive, or restart.
- Outcome metrics.
- Capacity allocation.
- Boundary and scope corrections.

## 8. Minimum dashboard

The first dashboard must remain intentionally small:

1. **Mission** — current mission and quarterly outcomes.
2. **Projects** — priorities, status, next milestones, and risks.
3. **Career** — high-fit opportunities and actions due.
4. **Content** — items in progress and awaiting approval.
5. **Build** — Munin and AIP delivery status.
6. **Executive Review** — SITREP, decisions, and next actions.

## 9. Initial data model

### Project record

```yaml
name: string
priority: P0 | P1 | P2 | P3
status: Active | Structured | Pilot | Maintenance | Paused | Archived
executive_owner: string
operating_owner: string
objective: string
next_milestone: string
next_action: string
dependencies: []
risks: []
decision_required: string | null
last_updated: YYYY-MM-DD
```

### Action record

```yaml
id: string
project: string
title: string
owner: string
status: Backlog | Ready | InProgress | Blocked | Done
due_date: YYYY-MM-DD | null
acceptance_criteria: []
evidence: []
```

### Decision record

```yaml
id: string
title: string
context: string
recommendation: string
status: Proposed | NeedsInformation | Approved | Rejected | Delegated | Superseded | Completed
owner: string
decided_at: YYYY-MM-DD | null
consequences: []
source_updates: []
```

## 10. MVP implementation sequence

### Phase 0 — Documentation foundation

- Accept this specification.
- Keep `PROJECTS.md` canonical.
- Define reusable SITREP, INCREP, EXECUTE, action, and decision templates.

### Phase 1 — Manual cockpit

- Create a current executive dashboard in Markdown.
- Populate Career, Content, Munin, and AIP summaries.
- Run one weekly review using only canonical documents.

### Phase 2 — Structured state

- Represent projects, actions, and decisions in machine-readable YAML or JSON.
- Add validation for required fields and allowed statuses.
- Generate the dashboard from structured records.

### Phase 3 — Munin integration

- Read canonical portfolio state.
- Produce contextual SITREPs.
- Create bounded EXECUTE packages.
- Maintain decision and evidence links.

### Phase 4 — Interface

- Add a web or conversational cockpit only after the manual and generated workflows prove useful.

## 11. MVP acceptance criteria

EOS v0.1 is accepted when:

1. All active initiatives have valid canonical records.
2. André can identify today's P0 action in under two minutes.
3. A weekly portfolio SITREP can be generated without reconstructing context from conversations.
4. Decisions and executions are linked to evidence and source-of-truth updates.
5. Career and Content pipelines expose items requiring action or approval.
6. Munin and AIP boundaries remain explicit.
7. The operating workflow is used for two consecutive weekly reviews.

## 12. Out of scope for v0.1

- Complex analytics.
- Autonomous external actions.
- Calendar and email orchestration.
- Multi-user collaboration.
- Mobile-native applications.
- Elaborate visual dashboards.
- Building a new database before the manual model is validated.

## 13. Immediate backlog

1. Create templates for `SITREP`, `INCREP`, `EXECUTE`, actions, and decisions.
2. Create the first Markdown executive dashboard.
3. Populate the Career Engine's current pipeline.
4. Populate the Content Engine with the Drex publication cycle.
5. Define the accepted Munin v0.1 scope.
6. Run the first weekly operating review and record friction.

## 14. Governance

- André owns prioritization and final decisions.
- ChatGPT owns operating design, strategic synthesis, and executive review support.
- Claude owns repository implementation, structured artifacts, validation, and automation.
- No autonomous action may override explicit portfolio priorities or approval guardrails.
- Every material change must update the canonical source of truth.