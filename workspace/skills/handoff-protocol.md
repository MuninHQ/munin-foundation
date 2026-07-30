# Skill: Handoff Protocol

Use whenever work moves between ChatGPT, Claude Code, another agent, or another session.

## Required handoff

- Objective and user outcome.
- Repository, branch, and relevant paths.
- Decisions already made and constraints that must remain.
- Work completed with evidence.
- Work remaining in priority order.
- Tests executed and exact results.
- Risks, blockers, and questions requiring the user.
- Single recommended next command or action.

## Rules

- Do not transfer hidden assumptions.
- Do not describe planned work as completed.
- Keep durable context in GitHub rather than relying only on chat history.
- A receiving agent must inspect the repository before changing files.