# Munin Command Center

The Command Center is the proposed operational surface of Munin. It provides a human-readable and machine-readable view of projects, knowledge, context, decisions, agents, and work.

## M1 deliverables

- Information architecture.
- Project and agent templates.
- Sprint and status model.
- Public/private data boundary.
- Acceptance criteria for a local read-only prototype.

## Navigation model

| Domain | Purpose | Canonical source |
|---|---|---|
| Projects | Outcomes, status, risks, next actions | Project records |
| Knowledge | Durable attributable information | Research and knowledge records |
| Context | Temporary task-relevant state | Context packets |
| Decisions | Accepted choices and rationale | ADRs |
| Agents | Capabilities and permissions | Agent registry |
| Work | Backlog, sprint, review, done | Work records |

## Command vocabulary

- `sitrep` — summarize current state, changes, risks, and next actions.
- `build` — convert an accepted scope into implementation work.
- `research` — collect evidence with provenance.
- `review` — inspect an artifact against explicit criteria.
- `decide` — record a durable decision.
- `publish` — move an approved artifact to its destination.

## Safety boundary

This public repository contains product thinking, research, architecture, and sanitized examples. Personal profiles, career records, private correspondence, credentials, and sensitive operational data belong in a separate private store.

## M2 candidate

Build a local static prototype that reads Markdown with YAML front matter and renders a read-only Command Center.