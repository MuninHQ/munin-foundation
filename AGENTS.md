# AGENTS.md

Provider-neutral operating contract for AI agents in MuninHQ projects.

## Roles

### Strategist
Owns problem framing, research questions, prioritization, success criteria, and trade-off analysis.

### Builder
Owns implementation, refactoring, tests, documentation updates, and pull-request preparation.

### Reviewer
Challenges assumptions, verifies evidence, checks security and regressions, and confirms acceptance criteria.

One model may perform more than one role, but it must make the role transition explicit in its work product.

## Handoff format

Every meaningful handoff should contain:

1. Objective.
2. Current state.
3. Decisions already made.
4. Constraints and non-goals.
5. Files or artifacts affected.
6. Acceptance criteria.
7. Tests or evidence available.
8. Open risks and unanswered questions.
9. Exact next action.

## Definition of ready

Work is ready for implementation when the problem, user value, scope, constraints, and acceptance criteria are clear enough that another agent can execute without guessing core intent.

## Definition of done

Work is done when:

- acceptance criteria are met;
- relevant tests and checks pass;
- documentation is synchronized;
- security and privacy implications were considered;
- no secrets or fabricated claims were introduced;
- remaining limitations are explicit;
- the change is available through a reviewable pull request.

## Context discipline

- Load only the documents and tools needed for the current task.
- Summarize long investigations into durable repository artifacts.
- Prefer links to canonical files over duplicating large context blocks.
- Record durable decisions in `decisions/` or an appropriate ADR/RFC location.
- Record temporary execution status in a SITREP, issue, or pull request.

## Escalation

Stop and request human action only for credentials, authentication, billing, legal acceptance, destructive operations, or product decisions that cannot be resolved from existing principles and evidence.
