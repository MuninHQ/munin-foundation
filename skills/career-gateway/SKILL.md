---
name: career-gateway
description: Retrieve and operate Career Command Center data through a governed server-side gateway.
---

# Career Gateway Skill

## Use when

Use this skill whenever a task depends on the user's private Career Command Center data: vacancies, applications, recruiters, interviews, email events, import runs, or pipeline history.

## Preconditions

- The server-side gateway is configured.
- The request is scoped to the authenticated user.
- The requested operation is allowlisted.

## Read workflow

1. Identify the smallest required read operation.
2. Fetch current data from the Career Gateway.
3. Check `generatedAt`, connector status, and degraded-state metadata.
4. Base conclusions only on returned records.
5. Include application/job identifiers when recommending an action.

## Mutation workflow

1. Read the target record immediately before mutation.
2. Confirm the command is allowlisted.
3. Provide a structured reason and evidence.
4. Execute once; never retry automatically.
5. Read the target again and verify the resulting state.
6. Preserve the returned audit identifier.

## Supported resources

- Overview
- Priority jobs
- Active applications
- Upcoming interviews
- Pending review events
- Recruiter activity
- Application details

## Safety

- Never expose gateway secrets.
- Never use service-role credentials in client-side code.
- Never send emails.
- Never infer missing compensation, dates, stages, or recruiter identity.
- Never treat newsletters as confirmed applications.

## Degraded mode

When the gateway is unavailable, return:

- explicit unavailable/degraded status;
- last successful synchronization timestamp, when known;
- no fabricated metrics or records;
- no write attempts.
