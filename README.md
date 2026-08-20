# Munin Foundation

**Building the foundations of Human Computing.**

Munin Foundation is the canonical product, architecture and execution repository behind Munin.

> We are not trying to build a better AI.  
> We are building a persistent contextual operating environment around human goals, evidence and continuity.

## Current phase

**Munin v0.1 — ChatGPT-first Operator Mode / Integration Hardening**

The repository contains working Control Room orchestration, bounded autonomous engineering, durable context/memory, Career intelligence/mobile intake, provider-neutral runtime seams, browser verification and operator-facing APIs. ChatGPT is the primary interactive operator cockpit for the current phase; Munin's default runtime requires neither a local LLM nor a paid AI API. Ollama remains an explicit opt-in capability rather than a startup dependency.

## Repository map

- `ops/` — canonical current state, backlog and session log
- `src/` — product/runtime implementation
- `tests/` — deterministic unit, integration and acceptance coverage
- `docs/product/` — product contract and implementation plan
- `docs/architecture/` — architecture, capability evaluations and engineering constitution
- `docs/brand/` and `assets/brand/` — canonical brand rules and asset registry
- `rfcs/` — durable proposals
- `research/` — hypotheses, evidence, experiments and Red Team
- `decisions/` — accepted decision records
- `journal/` — dated founder and research notes
- `archive/` — preserved legacy material

## Principles

1. Evidence over enthusiasm.
2. User autonomy over invisible consequential automation.
3. Context over generic intelligence.
4. Continuity over temporary conversations.
5. Portability over provider lock-in.
6. Simplicity over feature accumulation.
7. Privacy by design.
8. Safe reversible execution should continue until completion or a genuine human boundary.

## Canonical operating loop

`objective → hydrate → plan/route → execute → test → verify → fix/retry → write back → handoff`

Interactive operator path for the current phase:

`User ↔ ChatGPT cockpit → Munin control surfaces/connectors/repository → deterministic services/state/actions`

See `decisions/ADR-0006-CHATGPT-FIRST-OPERATOR-MODE.md`, `docs/product/munin-v0.1-spec.md`, `docs/product/munin-v0.1-build.md` and `ops/CURRENT_STATE.md` for the current product and execution truth.

## Status

Active implementation. Hypotheses and empirical claims remain evidence-bound; merged capabilities and accepted architectural decisions are represented by repository code, tests, ADRs and canonical operational state.
