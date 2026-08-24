# AI-Native Founder Playbook — Munin Adaptation

## Purpose

This document adapts the useful operating principles from Anthropic's *The Founder's Playbook: Building an AI-Native Startup* to Munin. It is a project guardrail and execution reference, not a dependency on Anthropic, Claude, or any paid inference provider.

Munin remains local-first, provider-neutral, zero-mandatory-cost, evidence-bound, auditable, and human-controlled for consequential actions.

## Core operating principle

Move the human progressively from repetitive execution toward orchestration while keeping consequential decisions visible and reversible.

Munin's canonical loop remains:

`objective → hydrate → plan/route → execute → test → verify → fix/retry → write back → handoff`

The AI-native extension is:

`opportunity → evidence → spec → architecture gate → bounded implementation → tests → verification → release → telemetry/feedback → iteration`

## Stage mapping

### 1. Idea / Opportunity

Munin should detect useful problems and opportunities from authorized context, research, operational friction, repeated requests, backlog signals, and explicit user goals.

Output should be a hypothesis rather than an implementation request.

Minimum evidence:
- problem or opportunity;
- affected workflow/user outcome;
- expected value;
- evidence/source;
- confidence;
- cheapest useful validation.

### 2. Validate

Before building a material capability, test whether it is genuinely useful and whether Munin already has an abstraction that solves most of the problem.

Prefer:
- existing Munin capabilities;
- deterministic/local solutions;
- small experiments;
- reversible changes;
- measurable acceptance criteria.

Reject integrations whose main justification is novelty, hype, duplicated capability, mandatory paid inference, or unnecessary vendor lock-in.

### 3. Spec

Do not send an underspecified feature directly to a coding agent.

For non-trivial work define:
- objective and user outcome;
- scope/non-scope;
- acceptance criteria;
- affected architectural seams;
- security/privacy implications;
- provider/cost implications;
- rollback path;
- test plan.

### 4. Architecture Gate

Architecture precedes autonomous implementation.

Before an agent changes code, verify:
- existing abstractions were inspected first;
- no unnecessary parallel orchestration/state/memory system is being created;
- provider neutrality is preserved;
- no mandatory paid dependency is introduced;
- approval/audit boundaries are preserved;
- secrets/private data remain outside source control;
- Windows remains first-class;
- the change has a bounded failure mode and rollback path.

For durable architectural changes, create/update an ADR or RFC before broad implementation.

### 5. MVP / Bounded Implementation

Agents should implement the smallest coherent change that proves the capability.

Preferred sequence:

`spec → inspect implementation/tests → plan → implement → unit/integration tests → verify → repair → report`

Autonomy is encouraged inside safe reversible boundaries. A genuine human boundary stops execution.

### 6. Launch / Release

A capability is not launched because code was generated.

Release gate:
- relevant tests pass;
- behavior is observable/auditable;
- configuration and failure states are documented;
- no secret was committed;
- human setup requirements are explicit;
- rollback is known;
- user-facing behavior has been verified where applicable.

### 7. Measure

Prefer evidence from actual use over agent confidence.

Track where appropriate:
- task completion rate;
- human interventions required;
- retries/failures;
- latency;
- cost when non-zero;
- false positives/false actions;
- duplicated work avoided;
- time saved;
- user corrections;
- security/safety events.

### 8. Iterate / Scale

Scale successful procedures by making them reusable and bounded, not by adding agents indiscriminately.

A repeated successful procedure may become:
- deterministic service;
- reusable skill;
- orchestration route;
- scheduled/conditional workflow;
- documented operating procedure.

New agents/frameworks are justified only when they create a measurable capability gain that existing Munin seams cannot provide cleanly.

## Agent execution gate

Before autonomous engineering, agents should be able to answer:

1. What user outcome is being improved?
2. What evidence says this is worth building?
3. Which existing Munin abstraction should own it?
4. What is the smallest coherent implementation?
5. What can fail and how does it fail closed?
6. How will the behavior be tested?
7. How will success be measured after release?
8. What requires human approval?

If these cannot be answered for material work, return to evidence/specification rather than generating broad code changes.

## AI-native integration evaluation

Evaluate new frameworks, playbooks, skills, agent runtimes, and open-source projects against:

- practical Munin problem solved;
- capability overlap;
- architecture fit;
- local/offline viability;
- mandatory monetary cost;
- privacy/security exposure;
- vendor lock-in;
- maintenance burden;
- Windows compatibility;
- testability/auditability;
- reversibility;
- expected measurable gain.

Possible decisions:

`adopt | adapt | experiment | watch | reject`

Default to `adapt` or `experiment` before `adopt`.

## Human role

The target is not maximum autonomy. The target is maximum useful execution without crossing consequential human boundaries.

Munin should increasingly handle research, routing, preparation, repetitive execution, testing, verification, reconciliation, and write-back while surfacing decisions whose consequences deserve human judgment.

## Relationship to existing Munin rules

This playbook supplements rather than replaces:
- `AGENTS.md`;
- architecture ADRs/RFCs;
- product specifications;
- Control Room state;
- security and approval gates;
- repository testing requirements.

When this document conflicts with an accepted ADR, explicit product contract, security constraint, or `AGENTS.md`, the more specific canonical rule wins.

## Source

Primary inspiration: Anthropic, *The Founder's Playbook: Building an AI-Native Startup* (published May 14, 2026). The Munin adaptation intentionally extracts operating principles rather than copying the source document or creating a Claude dependency.
