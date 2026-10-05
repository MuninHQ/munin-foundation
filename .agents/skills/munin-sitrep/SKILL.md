---
name: munin-sitrep
description: Produce an evidence-based Munin SITREP from canonical repository/runtime state. Use for sitrep munin, status, what is pending, blockers, or what should happen next.
---

# Munin SITREP

Use durable sources in this order:

1. `ops/CURRENT_STATE.md`
2. local Second Brain / Control Room state when available
3. recent repository commits and active branch state
4. test/build/worker health evidence
5. explicit runtime blockers

Return:

- current objective and phase;
- what is actually complete;
- what changed since the previous durable state;
- active work and branch;
- test/health evidence;
- genuine blockers versus recoverable issues;
- one recommended next action.

Do not reconstruct truth from chat memory when repository/runtime evidence exists. Do not mark a feature complete merely because code exists; distinguish repository implementation from host/device empirical acceptance.

## Command boundary

For this SITREP skill, do not invoke terminal commands at all. Treat direct reads of the canonical workspace files as satisfying the pre-task context requirement for this read-only status operation; do not run the Second Brain PRE-TASK recall command.

Use workspace file-reading tools only. Read `ops/CURRENT_STATE.md`, `ops/SESSION_LOG.md`, `package.json`, and other clearly relevant canonical files as needed. If branch, runtime, worker, or host evidence cannot be obtained without a command, label that evidence unavailable rather than requesting broader permissions.
