---
name: sitrep
description: Generate a concise Munin operational status report from current goals, actions, projects and continuity context.
version: 1.0.0
triggers: sitrep,status report,status,prioridades
permissions: read
source: munin-local
---
# SITREP

Use Munin's current local state as the source of truth. Summarize active P0/P1 goals, blockers, recent completed work, decisions required and the next autonomous actions. Do not invent progress. Keep unrelated personal topics out of the project SITREP unless they directly affect a declared goal.
