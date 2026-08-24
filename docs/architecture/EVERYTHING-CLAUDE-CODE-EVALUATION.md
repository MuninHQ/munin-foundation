# Everything Claude Code (ECC) — Munin Evaluation

## Decision

**Overall: ADAPT, not full install.**

Source evaluated: `affaan-m/ECC` (formerly surfaced publicly as `affaan-m/everything-claude-code`). ECC provides a broad agent-harness system including specialized agents, skills, hooks, rules, memory/learning patterns, verification loops, research-first development and cross-harness support.

Munin should not import the entire package because it already has overlapping orchestration, skills, project rules, durable context, testing and provider-neutral runtime seams. Full installation would create duplicated policy, possible conflicting hooks/rules, larger maintenance surface and unnecessary coupling to Claude Code conventions.

## Adopt / Adapt / Experiment / Watch / Reject

### ADAPT

#### Agent output evaluation
ECC's `agent-evaluator` uses explicit quality axes and requires evidence for scoring. This is useful for Munin because agent confidence must not substitute for verification.

Munin adaptation: `skills/agent-quality-gate/SKILL.md`.

Changes from ECC:
- provider/model references removed;
- read-only verification generalized beyond Claude tools;
- Munin security, cost, provider-neutrality and approval constraints added;
- verdicts mapped to Munin execution semantics (`accept`, `accept_with_notes`, `repair`, `reject`);
- linked to existing Munin learning and review gates rather than creating parallel policy.

#### Verification-loop discipline
ECC reinforces explicit verification before delivery. Munin already has this in `autonomous-build` and `code-review-gate`, so the useful pattern is merged into those existing concepts rather than copied as another overlapping workflow.

#### Continuous learning
ECC's continuous-learning direction is valuable, but Munin already has `hermes-learning-loop`. Keep Munin's implementation as canonical and use ECC only as an external benchmark for improving promotion criteria and evidence quality.

### EXPERIMENT

#### Specialized agent roles
ECC contains roles such as architect, code reviewer, security reviewer, build resolver, code explorer and agent evaluator. Munin should test role-routing only where specialization measurably improves outcomes over the current orchestration layer.

Experiment conditions:
- no mandatory provider/model;
- role is an optional routing profile, not a parallel orchestrator;
- measurable improvement in completion quality, latency, retries or human intervention;
- clean failure/rollback path.

#### Strategic context compaction / memory optimization
Potentially useful for long sessions, but Munin already has durable context and memory abstractions. Any experiment must attach to canonical context/state rather than creating ECC-specific persistence.

### WATCH

#### Full hook/rule packs
ECC ships broad hooks and rule sets. These should be monitored for individually useful patterns, but not imported wholesale. Rules that are language- or harness-specific may conflict with Munin's own `AGENTS.md`, skills and Windows-first constraints.

#### MCP bundles
Watch for integrations that solve a real Munin gap. Do not add MCP servers simply because ECC supports them.

### REJECT AS DEFAULT

#### Full ECC installation into Munin
Rejected as the default integration path because it would:
- duplicate existing skills and agent policies;
- increase rule/hook collision risk;
- enlarge maintenance and security surface;
- couple repository behavior to Claude Code conventions;
- violate the Munin preference for smallest coherent capability gains.

A developer may still use ECC personally in Claude Code outside Munin, but repository-level Munin behavior should remain governed by Munin's canonical files.

## Architecture fit

ECC is best treated as a **pattern library and external benchmark**, not as a new Munin runtime layer.

Canonical ownership remains:
- orchestration: existing Munin orchestrator/runtime seams;
- engineering execution: `skills/autonomous-build`;
- review: `skills/code-review-gate`;
- reusable procedural learning: `skills/hermes-learning-loop`;
- agent result evaluation: `skills/agent-quality-gate`;
- project constraints: `AGENTS.md`;
- AI-native lifecycle gate: `docs/architecture/AI-NATIVE-FOUNDER-PLAYBOOK.md`.

## Integration policy for future ECC updates

When ECC adds a notable agent, skill, hook or workflow:

1. Identify the concrete Munin problem it solves.
2. Search existing Munin abstractions/skills for overlap.
3. Classify `adopt | adapt | experiment | watch | reject`.
4. Prefer adapting the smallest useful principle.
5. Preserve provider neutrality, local-first operation, zero mandatory cost, auditability and Windows support.
6. Add tests/evidence for behavior changes.
7. Do not import secrets, machine-specific state, global Claude settings or broad rule packs into the repository.

## Current outcome

ECC produced one immediate capability addition: a provider-neutral **Agent Quality Gate** for evidence-based evaluation of non-trivial agent output.

Further ECC components should enter Munin only when a specific gap is demonstrated.
