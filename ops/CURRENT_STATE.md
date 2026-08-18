# Munin Current State

> Canonical operational snapshot. Update after meaningful execution.
>
> Last updated: 2026-08-18

## Current objective

Operate Munin as a coherent persistent execution environment that accepts objectives, continues safe work autonomously, verifies outcomes, preserves durable context, and exposes the same truth across web, mobile, GitHub and local execution.

## Current phase

**v0.1 backlog closeout / empirical acceptance**

## Active architecture decision

`User objective → Munin Orchestrator → specialist agents → engineering/runtime capabilities → independent QA → durable state/memory → operational verification`

The repository is the durable source of truth for product/execution state. Runtime-only private data stays outside Git. Reversible work continues autonomously until a genuine human-only boundary is reached.

## Completed foundations and integrations

- Control Room protocol, canonical backlog/state/session files and bounded `PLAN → BUILD → TEST → VERIFY → FIX` loop.
- Multi-agent supervisor, production specialist adapters, CLI/API orchestration entrypoints and real-blocker classification.
- Skill-aware autonomous engineering, governed read-only Playwright verification, provider capability seams, recovery, leases/fencing/outbox and optional Ollama fallback.
- External Intelligence Provider, independent engineering reviewer and internal Munin MCP bridge without introducing a second orchestrator.
- Cross-run Control Room continuity acceptance and engineering QA-recovery end-to-end acceptance.
- Append-only Memory Ledger, governed/secret-safe ChatGPT historical project-memory promotion and mobile memory access.
- Career Continuity Realm, Career Inbox/Intelligence, Career Mobile Intake, transient Vision parsing, normalization/deduplication, Career Quick Intake web UI and stable iOS Share Sheet/Shortcut contract.
- Munin v0.1 product/build contract consolidated around bounded execution and durable continuity.
- AIP architecture concepts consolidated into the canonical Munin v0.1 map; AIP is not a parallel implementation backlog.
- LinkedIn Content Intelligence foundation, Trusted Source Radar freshness/provenance hardening, unbranded-by-default editorial policy and governed Publisher approval/manual-publication surface.
- Canonical Brand Asset Registry with no-approximation policy.
- Read-only Gmail/Outlook connector permission contract and unified operator SITREP.
- OAuth token-at-rest hardening: auto-prefer macOS Keychain/Linux Secret Service, fail-closed keychain mode, legacy JSON migration and explicit unsupported-host fallback.
- Provider-neutral `media.local-video` capability with no automatic model downloads, explicit runner configuration and host benchmark CLI; MiniMax H3 evaluation recorded without making it a default dependency.
- Remote/local Windows + Tailscale operator runbook including deterministic stale-port/UI recovery.
- August 2026 GitHub ecosystem scan completed; future scans are trigger-based instead of a permanently open queue item.
- Web navigation hardening includes shared standalone navigation/styles, missing Intelligence page restoration, Career Quick Intake exposure and a navigation integrity test.

## Executable backlog state

The canonical `ops/BACKLOG.md` has **no unchecked repository-software items in the current v0.1 phase**.

New engineering work should be created only when:

- empirical acceptance exposes a defect or missing capability;
- a current dependency becomes unsafe/unmaintained;
- a benchmark proves a materially better replacement;
- a new user objective creates a new scoped requirement.

## Empirical / human-boundary acceptance remaining

These observations/actions cannot be truthfully completed through repository edits alone:

1. Install and validate the documented **Enviar vaga ao Munin** iOS Shortcut on the target iPhone using a real LinkedIn URL and screenshot; confirm no unwanted image is saved.
2. If local MiniMax H3 is worth promoting, review/accept the current upstream model license, deliberately install the chosen backend/weights on the actual host and run `npm run video:benchmark`; retain another backend if quality/speed/storage are not acceptable.
3. Supply exact AJ/Munin master assets where exact-asset composition is desired. LinkedIn editorial artwork remains unbranded when they are absent.
4. Public LinkedIn publication remains a human action after Publisher approval/package preparation; Munin records the resulting URL rather than silently posting.
5. Credentials, OAuth grants, 2FA, paid-service activation and irreversible consequential actions remain explicit human boundaries.

## Follow-on hardening opportunities (not v0.1 blockers)

- Add a Windows current-user secure vault/DPAPI adapter to replace the explicit OAuth JSON fallback when a reliable zero-additional-cost implementation is validated.
- Add richer AI-provider latency/retry observability if runtime evidence shows operator value.
- Promote Serena or another semantic backend only if the existing benchmark proves material improvement over native repository intelligence.
- Expose a standards-compliant external MCP transport around the existing internal Munin MCP bridge if a real external client requires it.

## Guardrails

- No automatic public publication without explicit approval.
- No material paid service dependency without explicit approval.
- Prefer zero-additional-cost tooling where viable.
- Preserve model/provider portability.
- Do not persist transient screenshots, credentials or private document contents in Git.
- Reversible technical decisions may proceed autonomously when consistent with accepted principles.
- While a safe, reversible, executable next action exists, the Orchestrator continues without requiring `cont`, `next`, or `build` from the user.
