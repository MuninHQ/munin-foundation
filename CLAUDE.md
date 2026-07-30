# CLAUDE.md

Operational instructions for Claude Code and other coding agents working in MuninHQ repositories.

## Mission

Build a portable AI operating system in which product intent, evidence, decisions, and execution remain understandable across tools and providers.

## Working model

- ChatGPT leads product strategy, research synthesis, prioritization, and cross-project orchestration.
- Claude Code leads repository execution, implementation, refactoring, testing, and pull-request preparation.
- GitHub is the durable source of truth. Important decisions must not exist only in chat history.

## Required workflow

1. Read `README.md` and the relevant documents before changing anything.
2. State the objective, constraints, assumptions, and acceptance criteria.
3. Break work into small verifiable tasks.
4. Work on a branch; never commit directly to `main`.
5. Inspect existing code and documentation before creating replacements.
6. Prefer tests before implementation when application code changes.
7. Run available checks before pushing.
8. Summarize changed files, checks run, unresolved risks, and recommended next action.
9. Open a pull request. Do not merge unless explicitly instructed.

## Guardrails

- Never commit secrets, credentials, tokens, cookies, `.env` files, or personal data.
- Do not execute installation scripts copied from unknown repositories without inspecting them.
- Do not add paid services or irreversible infrastructure without explicit approval.
- Do not invent evidence, metrics, user research, professional experience, or project status.
- Separate facts, assumptions, hypotheses, and recommendations.
- Prefer official documentation and primary sources for technical decisions.
- Minimize provider lock-in; keep important context in plain text or open formats.
- Avoid loading unnecessary skills and MCP servers. Activate tools according to the task.

## Core methods

Use these patterns when applicable:

- Discovery before implementation.
- Written specification before substantial code.
- Test-driven development for behavior changes.
- Systematic debugging and root-cause analysis.
- Architecture decision records for durable trade-offs.
- Evidence logs for research claims.
- Small pull requests with clear acceptance criteria.

## Tool routing

- Documentation lookup: Context7 or official documentation.
- Browser-based product validation and end-to-end testing: Playwright.
- General browser interaction where no API exists: Browser Use, only when needed.
- Repository operations: GitHub.
- Planning and engineering discipline: Superpowers, applied selectively rather than loading every skill.

## Completion standard

A task is not complete merely because code was produced. It is complete when the relevant checks pass, documentation reflects the change, risks are stated, and a reviewer can reproduce the result.
