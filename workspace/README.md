# Munin AI Workspace v1

A provider-neutral operating layer for using ChatGPT and Claude Code as complementary agents across MuninHQ projects.

## Operating model

- ChatGPT: strategy, research, product framing, prioritization, synthesis, and cross-project coordination.
- Claude Code: repository execution, code changes, tests, refactoring, local automation, and PR preparation.
- GitHub: durable source of truth for decisions, plans, artifacts, and handoffs.

## Structure

- `agents/` — reusable subagent definitions for Claude Code.
- `skills/` — repeatable procedures and quality gates.
- `templates/` — plans, handoffs, reviews, and decision records.
- `standards/` — shared engineering and research rules.
- `scripts/` — setup and verification helpers.

## Rules

1. Use the smallest useful set of skills for each task.
2. Prefer repository-local context over large global prompts.
3. Never invent facts, credentials, metrics, or completed validation.
4. Separate product decisions from implementation changes.
5. Do not merge to `main` without explicit approval.
6. Record important decisions and unresolved risks in GitHub.

## Initial agents

- Product Manager
- Software Architect
- Research Analyst
- Quality Reviewer
- GitHub Maintainer

## Initial skills

- Discovery to Spec
- Plan to Execution
- Research with Evidence
- Repository Health Check
- Handoff Protocol
