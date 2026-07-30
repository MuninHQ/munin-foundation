# Munin Career Integration v1

## Purpose

Connect Munin to the existing Career Command Center without merging repositories, databases, or deployments. Munin becomes the orchestration and executive overview layer; Career Command Center remains the system of record for vacancies, applications, recruiters, interviews, and email-derived career events.

## Architecture

```text
Munin Mission Control
  -> Career Gateway (read-first contract)
      -> Career Command Center API / Supabase RPC
          -> jobs
          -> applications
          -> contacts
          -> interviews
          -> email_events
          -> import_runs
```

## V1 capabilities

1. Career overview: active applications, priority vacancies, upcoming interviews, pending reviews, and latest recruiter activity.
2. Deep links into the Career Command Center.
3. Read-only agent access by default.
4. Explicitly approved commands for safe mutations.
5. Auditability for every command initiated from Munin.

## Security boundaries

- Career Command Center remains the source of truth.
- No direct service-role key in browser clients.
- Munin must use a server-side gateway.
- Every query is scoped to the authenticated user.
- Write actions require an allowlisted command and an audit record.
- Email sending remains disabled; draft creation only.

## Required Career Gateway operations

### Reads

- `getCareerOverview()`
- `listPriorityJobs()`
- `listActiveApplications()`
- `listUpcomingInterviews()`
- `listPendingReviews()`
- `listRecentRecruiterActivity()`
- `getApplication(applicationId)`

### Commands

- `confirmReviewEvent(eventId, overrides?)`
- `ignoreReviewEvent(eventId)`
- `updateApplicationStage(applicationId, stage, reason)`
- `createEmailDraft(applicationId, intent)`

## Career overview response

```json
{
  "generatedAt": "ISO-8601",
  "metrics": {
    "activeApplications": 0,
    "priorityJobs": 0,
    "upcomingInterviews": 0,
    "pendingReviews": 0,
    "automaticLinkRate": 0
  },
  "priorityJobs": [],
  "upcomingInterviews": [],
  "pendingReviews": [],
  "recentRecruiterActivity": []
}
```

## Failure behavior

- A connector failure must not affect other Munin modules.
- Return a typed degraded state instead of fabricated data.
- Cache the latest successful overview for display with a stale timestamp.
- Never retry write commands automatically.

## Delivery phases

### Phase 1 — Contract and governance

- Integration contract
- Career Orchestrator agent
- Career Gateway skill
- Environment schema
- Read-only default policy

### Phase 2 — Gateway implementation

- Server-side client
- Authentication and RLS validation
- Overview endpoint
- Deep links
- Contract tests

### Phase 3 — Governed commands

- Review confirmation
- Pipeline stage updates
- Draft creation
- Audit trail

## Definition of done for v1

- Munin can retrieve a real career overview from the Career Command Center.
- No Career data is duplicated in Munin.
- No unrestricted database credentials are exposed.
- Failed calls return explicit degraded states.
- All write commands are allowlisted and auditable.
