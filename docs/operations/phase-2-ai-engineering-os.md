# Phase 2 — AI Engineering Operating System

## Goal

Move from isolated agent usage to a governed, reusable delivery system for MuninHQ projects.

## Architecture

1. **Strategy layer** — ChatGPT frames objectives, research, prioritization, and cross-project decisions.
2. **Execution layer** — Claude Code changes repositories, runs tools, and prepares evidence.
3. **Specialist layer** — reusable subagents perform product, architecture, research, quality, GitHub, orchestration, and governance work.
4. **Governance layer** — skills and quality gates ensure implementation, documentation, CI, roadmap, and handoffs remain consistent.
5. **GitHub layer** — durable source of truth for plans, decisions, pull requests, evidence, and unresolved risks.

## Delivery lifecycle

Objective → scoped specification → execution plan → delegated implementation → integration → independent quality review → repository governance review → user approval for protected actions → handoff.

## Phase 2 assets

- `work-orchestrator` agent;
- `repository-governor` agent;
- `governed-delivery` skill;
- `parallel-work-coordination` skill;
- delivery handoff template.

## Guardrails

- No automatic merge or deployment.
- No fabricated evidence or completion claims.
- No credentials, paid services, destructive changes, or weakened protections without explicit approval.
- Parallel work only for independent workstreams.
- Repository state and documentation must agree before completion.

## Validation plan

1. Install workspace assets locally with the existing installer.
2. Restart Claude Code.
3. Ask the work orchestrator to create a read-only delivery plan.
4. Ask the repository governor to audit the plan and repository state.
5. Confirm both agents are discoverable and produce evidence-based output.

## Next iteration

After local validation, add project adapters for Munin, North Star, AIP, YT-Lab, and Career Operations. Each adapter should add only project-specific context and must not duplicate the global agents or skills.
