# Munin Control Plane v1

## Purpose

Control Plane v1 turns existing Munin execution, memory, SITREP and repository foundations into one state-driven operating model. It does not replace the canonical Control Room or create a provider-specific orchestrator.

## Source-of-truth boundaries

- GitHub remains authoritative for product/code/PR/CI state.
- `ops/BACKLOG.md`, `ops/CURRENT_STATE.md` and `ops/SESSION_LOG.md` remain canonical repository-backed operational state.
- `ProjectMemoryStore` and `MemoryLedger` remain canonical durable decision/history stores.
- `data/runtime/control-plane-tasks.json` is a derived runtime execution projection, not a product source of truth.
- ChatGPT Work may orchestrate planning and work-management activity, but the Control Plane domain is provider-neutral.

## Task contract

`ControlPlaneTask` contains:

- `id`
- `title`
- `priority`: `P0 | P1 | P2 | P3`
- `status`
- `owner`
- `source`
- `dependencies`
- `acceptanceCriteria`
- `evidence`
- optional `blocker`
- `createdAt`
- `updatedAt`

Canonical forward lifecycle:

`queued → planning → building → testing → verifying → done`

Every active stage may transition to `blocked`. A blocked task may resume into the appropriate active stage. `done` requires evidence whenever acceptance criteria exist.

## Autonomous execution relationship

The existing Munin autonomous execution loop remains authoritative for engineering execution:

`PLAN → BUILD → TEST → VERIFY → FIX`

Control Plane task state projects that activity into operator-visible status; it does not introduce a second engineering loop.

## Decision contract

`ControlPlaneDecision` records:

- decision
- context
- rationale
- alternatives considered
- affected references
- source
- timestamp
- `supersedes` / `supersededBy`

Persistence uses the existing `ProjectMemoryStore` plus append-only `MemoryLedger`. No parallel decision database is introduced.

## Persistent context and SITREP

Live projection combines:

1. canonical backlog-derived tasks;
2. feature-flagged runtime execution tasks;
3. current durable decisions from project memory.

The existing `MuninService.sitrep()` remains the API contract. Control Plane text is appended to the legacy SITREP rather than replacing it. If Control Plane hydration fails, the legacy SITREP still returns.

The projection exposes:

- overall status;
- active work;
- blocked work and whether human action is required;
- completed work;
- current decisions;
- prioritized next actions;
- evidence counts.

## Runtime tracking feature flag

Set:

`MUNIN_CONTROL_PLANE_TRACKING=true`

to enable orchestrator lifecycle write-back into the derived runtime projection. When disabled, existing Control Room execution behavior is unchanged.

Agent execution maps to Control Plane phases and records durable execution evidence. Final orchestration results become `done` only after the tracked flow reaches verification and has evidence; blocked/failed runs are represented explicitly.

## Work ↔ GitHub ↔ Munin handoff contract

The Control Plane normalizes these event classes without binding them to a particular model vendor:

- task created/prioritized → canonical task/backlog state;
- engineering dispatched → runtime task enters `building`;
- branch/commit/PR produced → task evidence;
- test/QA evidence produced → `testing` / `verifying` evidence;
- blocker detected → `blocked` with human-boundary classification;
- task completed → `done` with evidence;
- decision recorded → Project Memory + Memory Ledger;
- SITREP requested → state-derived live projection.

GitHub-specific repository evidence is represented as references/evidence values rather than embedded in the core state machine.

## Munin v0.1 mapping

Control Plane v1 composes existing v0.1 capabilities:

- Control Room hydration/write-back → canonical operational context;
- autonomous execution harness → engineering execution state machine;
- multi-agent orchestrator → objective routing and recovery;
- Memory Ledger / Project Memory → durable decisions and provenance;
- SITREP → operator projection and `/api/sitrep` surface;
- web/mobile Control Room → existing command-center presentation surface;
- Career and LinkedIn realms → unchanged domain modules consuming the same underlying runtime and memory boundaries.

## Guardrails

- No automatic consequential external action.
- No paid dependency without explicit approval.
- No transient screenshots, credentials or private document bodies in Git.
- Provider/model portability is preserved.
- Runtime projection failures must not break the legacy SITREP.
- Career, LinkedIn and other product realms must remain regression-safe.
