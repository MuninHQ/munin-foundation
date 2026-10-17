# Munin competitive reverse-engineering audit — 2026-10-13

## Scope and verified Munin baseline

Munin's current public repository already has Control Room execution, memory ledger, action approval, a browser flow viewer, sandbox/Host Worker recovery, Capability Radar, Munin Guard, trace telemetry and evidence provenance. See `README.md`, `ops/CURRENT_STATE.md`, `src/capability-radar-service.ts`, `src/munin-guard.ts` and accepted `decisions/ADR-0007-SELECTIVE-OPENMUSE-PATTERNS.md` (if located under a different path, use the repository's canonical ADR-0007). OpenMuse's leased jobs, browser sessions and tamper evidence were already selectively adopted in PR #379. Do not rediscover or replace those subsystems.

The goal here is **feature-level comparison**, not copying competitors or installing another agent framework. All external observations below are from public repository documentation, not from a REA run. REA has not been executed against a third-party binary in this change. Hypothesized value is not a measured benefit.

## Compared projects

| Source | Publicly documented pattern | Munin comparison / decision |
| --- | --- | --- |
| [Langfuse](https://github.com/langfuse/langfuse) | Datasets, evaluations and repeatable trace experiments | **Investigate first**: Munin has traces and replay receipts; test whether comparative scenario evaluation produces useful regression signals. Do not add Langfuse infrastructure by default. |
| [Letta](https://github.com/letta-ai/letta) | Stateful agents and durable long-term memory | **Investigate**: Munin's Memory Ledger and Second Brain exist. Focus on contradiction review and user-visible memory corrections, not importing a second memory store. |
| [OpenHands / Agent Canvas](https://github.com/OpenHands/OpenHands) | Multiple agent backends, persistent sessions, isolated execution and operator workflows | **Investigate**: assess recovery/HUD session-resume usability; retain Munin's current orchestrator, worktrees and permission gates. |
| [n8n](https://github.com/n8n-io/n8n) | Visual workflow templates, connectors and run history | **Study interface patterns only**: Munin already has deterministic flows and a read-only graph; an editing UI should follow a demonstrated operator need. n8n uses fair-code/Sustainable Use licensing, not generic MIT. |
| [Browser Use](https://github.com/browser-use/browser-use) | Local browser/agent workflows and recorded browser outcomes | **Mostly overlap**: Munin already uses governed browser verification and named read-only sessions. Cloud/hosted model use may add cost. |
| [Dify](https://github.com/langgenius/dify) | Agent/workflow composition, tool and RAG pipelines | **Defer**: overlaps existing Control Room/flows; the Dify Open Source License adds conditions beyond Apache 2.0. |
| [REA](https://github.com/morluto/rea) | Evidence-linked investigation of JS/Electron, .NET, native binaries and app behavior | **Research tool, opt-in only**: use where public source and ordinary interface inspection leave a specific unanswered question and inspection is authorized. |

## First candidate: Langfuse-like comparative replay

Specific opportunity: for a fixed set of real Munin missions, compare **the existing behavior** with one isolated proposed change. Track success, false completion, human intervention count, runtime, token/cost metadata availability and reversibility. Missing or estimated values are explicitly marked, not invented. A proposal advances only when replay evidence supports material improvement without worse security or autonomy. This is **not yet implemented** by this PR; this PR introduces a read-only intake gate to keep the research evidence and test plan coherent.

Related gaps worth investigating after that baseline: (a) Letta-like memory contradiction review, (b) OpenHands-like operator recovery and handoff, then (c) n8n-like reusable workflow templates, if actual Munin users demonstrate the need.

## Read-only feature-dossier intake (new)

`scripts/reverse-engineering-audit.mjs` records whether individual feature proposals have:
1. A source URL and declared inspection basis: public UI behavior, permissioned binary or open-source code with supplied authorization/license evidence.
2. A verifiable observation and source URL, plus the matching Munin module and existing/partial/missing overlap.
3. Steps to reproduce the finding in a controlled experiment.
4. A numeric **hypothesis** defining baseline, hoped-for target and direction (not a claim of observed performance).
5. An explicit rollback plan.

Possible results: `skip-duplicate`, `needs-evidence`, `ready-to-benchmark`. The last is **not adoption**, promotion, code execution, or permission to copy code. Rights evidence is supplied by the dossier author and requires human verification. No automated inspection or REA execution is enabled.

Example:
```sh
node scripts/reverse-engineering-audit.mjs research/rea-dossiers/langfuse-evaluations.json
node --test tests/reverse-engineering-audit.test.mjs
```

The example deliberately returns `needs-evidence`: we do not yet have a measured Munin baseline and target hypothesis. Do not make up numbers to pass this gate.

## Applying REA later, safely

On an authorized machine with Node in REA's supported range, first review REA's installation, prerequisites and target permissions at https://github.com/morluto/rea. REA's documented setup is `npx rea-agents setup`, which proposes local MCP/agent config changes and requires reviewing them. **Do not silently install or activate it on the Munin host.** For open-source targets, prefer direct source inspection, tests and public documentation; use REA only when it answers a concrete question source inspection cannot. Normalize any resulting evidence to a dossier: the audited intake is intentionally independent of REA's evolving output schema.

Munin remains local-first, Windows-compatible, and zero mandatory paid API cost. Never persist decompiled proprietary code, credentials, browser profile tokens, private user data or copyrighted assets into Git. Treat n8n and Dify license conditions individually.

## Acceptance and remaining boundaries

- The five targeted Node tests pass in a standalone Node 22 environment; no Munin full-suite, Windows-host or browser-session test was executed as part of this analysis.
- No Munin runtime path, approval gate, dependency, or automatic skill promotion is modified by this branch.
- Run the standalone tests and the normal Munin suite on the actual checkout before promotion.
- Run REA itself only after host connectivity, license/access validation and explicit review of setup modifications.
