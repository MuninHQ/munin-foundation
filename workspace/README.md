# Munin AI Workspace v1

A provider-neutral operating layer for using ChatGPT and Claude Code as complementary agents across MuninHQ projects.

## Operating model

- ChatGPT: strategy, research, product framing, prioritization, synthesis, and cross-project coordination.
- Claude Code: repository execution, code changes, tests, refactoring, local automation, and PR preparation.
- GitHub: durable source of truth for decisions, plans, artifacts, and handoffs.

## Structure

- `agents/` — five reusable Claude Code subagent definitions.
- `skills/` — five installable skills, each packaged as `<name>/SKILL.md`.
- `scripts/install-munin-workspace.ps1` — installs and verifies both asset types under `~/.claude/`.

## Rules

1. Use the smallest useful set of skills for each task.
2. Prefer repository-local context over large global prompts.
3. Never invent facts, credentials, metrics, or completed validation.
4. Separate product decisions from implementation changes.
5. Do not merge to `main` without explicit approval.
6. Record important decisions and unresolved risks in GitHub.

## Agents

- Product Manager
- Software Architect
- Research Analyst
- Quality Reviewer
- GitHub Maintainer

## Skills

- Discovery to Spec
- Plan to Execution
- Research with Evidence
- Repository Health Check
- Handoff Protocol

## Installation

From the repository root in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-munin-workspace.ps1
```

Restart Claude Code after installation. The script reports installed counts and fails when post-install verification cannot find an expected asset.