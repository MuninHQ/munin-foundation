# RFC-004 — Munin Command Center

- Status: Proposed
- Phase: Project Apollo
- Owner: Munin Foundation
- Date: 2026-08-05

## Summary

The Munin Command Center is a human-controlled operational surface for navigating projects, context, knowledge, decisions, agents, and active work without turning Munin into an opaque autonomous system.

## Problem

Knowledge and execution are commonly fragmented across conversations, documents, repositories, tools, and temporary AI sessions. Users must repeatedly reconstruct context and manually decide where work belongs.

## Proposal

Create a single navigational layer with six bounded domains:

1. **Projects** — active initiatives, outcomes, status, risks, and next actions.
2. **Knowledge** — durable, attributable information and research.
3. **Context** — current state relevant to an active task.
4. **Decisions** — accepted choices and their rationale.
5. **Agents** — explicit capabilities, inputs, outputs, limits, and permissions.
6. **Work** — backlog, current sprint, completed work, and review queue.

## Principles

- Human approval remains explicit for consequential actions.
- Context and memory are separate concepts.
- Every generated artifact has provenance.
- Agents are inspectable and replaceable.
- The Command Center is a view over canonical sources, not a second database.
- Personal or sensitive data must not be committed to the public foundation repository.

## Information model

```text
Command Center
├── projects
├── knowledge
├── context
├── decisions
├── agents
└── work
```

## M1 scope

M1 establishes the information architecture, canonical templates, navigation model, and acceptance criteria. It does not include provider integrations, autonomous execution, or personal-data ingestion.

## Acceptance criteria

- A project can be described with a common template.
- An agent can be registered with explicit permissions and limitations.
- Current work can be represented as a sprint with risks and next actions.
- Context is distinguishable from durable knowledge.
- Public and private information boundaries are documented.

## Non-goals

- Unattended execution.
- Hidden long-term memory.
- Provider-specific orchestration.
- Publishing an individual user's private operating context.

## Next phase

M2 should validate the model through a minimal local prototype that renders Markdown/YAML sources into a read-only dashboard.