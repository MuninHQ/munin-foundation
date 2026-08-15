---
name: project-continuity
description: Capture and retrieve durable Munin project knowledge without storing unrelated chat noise.
version: 1.0.0
triggers: munin,decisão,arquitetura,backlog,memória do projeto
permissions: read,local-write
source: munin-local
---
# Project Continuity

Persist project knowledge, not raw conversation. Extract decisions with rationale, requirements, architecture, research findings, rejected alternatives, backlog items and lessons learned. Preserve source and timestamp, deduplicate repeated observations and mark older conflicting records as superseded. Never route unrelated conversation into Munin project memory by default.
