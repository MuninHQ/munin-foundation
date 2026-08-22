# Munin Current State

> Canonical operational snapshot. Update after meaningful execution.
>
> Last updated: 2026-08-22

## Current objective

Operate Munin as a coherent persistent execution environment that accepts objectives, continues safe deterministic work autonomously, verifies outcomes, preserves durable context, and exposes the same truth across ChatGPT, web, mobile, GitHub and local execution without requiring a local LLM or a paid AI API.

## Current phase

**v0.1 ChatGPT-first operator bridge / empirical acceptance**

## Active architecture decision

`User ↔ ChatGPT cockpit → Munin control surfaces/connectors/repository → deterministic services/state/actions`

Munin remains the durable source of truth for product/execution state. ChatGPT is the primary interactive intelligence/operator cockpit for the current phase, but ChatGPT conversation history is not the system of record. Runtime-only private data stays outside Git. Reversible work continues autonomously until a genuine human-only or external-intelligence boundary is reached.

In-process AI is optional. The default runtime does not probe, start or wait for Ollama and does not require an OpenAI API key. Ollama can be enabled only through explicit opt-in (`MUNIN_OLLAMA_ENABLED=1`); automatic local service startup requires the additional explicit `MUNIN_OLLAMA_SELF_HEAL=1` opt-in. See ADR-0006.

## Completed foundations and integrations

- Control Room protocol, canonical backlog/state/session files and bounded `PLAN → BUILD → TEST → VERIFY → FIX` loop.
- Multi-agent supervisor, production specialist adapters, CLI/API orchestration entrypoints and real-blocker classification.
- Skill-aware autonomous engineering, governed read-only Playwright verification, provider capability seams, recovery, leases/fencing/outbox and optional provider support.
- ChatGPT-first operator contract: no mandatory paid AI API, no implicit Ollama autodetect, no automatic local-model startup, and explicit `External intelligence required` boundaries for inference-only capabilities.
- ChatGPT Operator Bridge on the primary Web and Mobile entrypoints: generates a bounded sanitized local snapshot, copies an operator handoff prompt, opens ChatGPT using the existing user session, and never places the Munin mobile token or API credentials in the handoff payload.
- Local Web assistant is explicitly labeled deterministic/local and directs free-form reasoning to the ChatGPT Cockpit rather than presenting Ollama/provider setup as the normal path.
- External Intelligence Provider, independent engineering reviewer and internal Munin MCP bridge without introducing a second orchestrator.
- Cross-run Control Room continuity acceptance and engineering QA-recovery end-to-end acceptance.
- Append-only Memory Ledger, governed/secret-safe ChatGPT historical project-memory promotion and mobile memory access.
- Career Continuity Realm, Career Inbox/Intelligence, Career Mobile Intake, transient Vision parsing, normalization/deduplication, Career Quick Intake web UI and stable iOS Share Sheet/Shortcut contract.
- Munin v0.1 product/build contract consolidated around bounded execution and durable continuity.
- AIP architecture concepts consolidated into the canonical Munin v0.1 map; AIP is not a parallel implementation backlog.
- LinkedIn Content Intelligence foundation, Trusted Source Radar freshness/provenance hardening, unbranded-by-default editorial policy and governed Publisher approval/manual-publication surface.
- Canonical Brand Asset Registry with no-approximation policy.
- Read-only Gmail/Outlook connector permission contract and unified operator SITREP.
- OAuth token-at-rest hardening: auto-prefer macOS Keychain, Linux Secret Service or Windows CurrentUser DPAPI; fail-closed required-secure mode; legacy JSON migration; secrets never passed in Windows command-line arguments and only an encrypted DPAPI blob remains in the runtime directory.
- Provider-neutral `media.local-video` capability with no automatic model downloads, explicit runner configuration and host benchmark CLI; MiniMax H3 evaluation recorded without making it a default dependency.
- Remote/local Windows + Tailscale operator runbook including deterministic stale-port/UI recovery.
- August 2026 GitHub ecosystem scan completed; future scans are trigger-based instead of a permanently open queue item.
- Munin Radar and unified Action Inbox: trusted regulatory-source changes, workspace actions and actionable career/email signals converge into explicit `Agora`, `Revisar`, `Executando`, `Concluído` and `Radar` lanes.
- Connector Registry exposes enabled state, zero-cost policy, authentication mode, last check and health for trusted sources plus Gmail/Outlook without exposing credentials.
- Mobile-first Radar and Action Inbox surfaces are available from shared navigation and command keyboard shortcuts.
- Manus Operational Bridge delegates only allowlisted research/analysis/draft/diagnostic tasks through API v2, enforces local daily task and declared-credit budgets, polls asynchronous results and projects waiting/completed/failed work into the Action Inbox.
- The existing Host Worker now supports one composite `deploy-main` operation pinned to clean `main`: fast-forward, full tests/build, supervised restart and API/web health verification. Manus Desktop remains folder-scoped and no arbitrary remote shell is introduced.
- Web navigation hardening includes shared standalone navigation/styles, missing Intelligence page restoration, Career Quick Intake exposure and a navigation integrity test.
- Unified operator workflow exposes `munin start`, `build`, `verify`, `ship`, `doctor` and `mobile-test`; the ship gate requires committed changes, passes the full test suite, pushes the mission branch and reuses one draft PR without automatic merge.

## Executable backlog state

Issue #237 tracks the ChatGPT-first operator pivot. Repository implementation is complete through the Operator Bridge; remaining acceptance is empirical host/device verification rather than missing core software.

New engineering work should be created only when:

- empirical acceptance exposes a defect or missing capability;
- a current dependency becomes unsafe/unmaintained;
- a benchmark proves a materially better replacement;
- a new user objective creates a new scoped requirement.

## Empirical / human-boundary acceptance remaining

These observations/actions cannot be truthfully completed through repository edits alone:

1. On the target Windows host, pull/restart the current `main`, verify normal startup/core deterministic flows do not launch, probe or wait for Ollama, and exercise the Web ChatGPT Cockpit handoff once in the real browser session.
2. On the target iPhone, exercise the Mobile ChatGPT Cockpit handoff once and confirm the handoff contains only the expected sanitized Munin snapshot and no mobile token.
3. Install and validate the documented **Enviar vaga ao Munin** iOS Shortcut on the target iPhone using a real LinkedIn URL and screenshot; confirm no unwanted image is saved.
4. If local MiniMax H3 is worth promoting, review/accept the current upstream model license, deliberately install the chosen backend/weights on the actual host and run `npm run video:benchmark`; retain another backend if quality/speed/storage are not acceptable.
5. Supply exact AJ/Munin master assets where exact-asset composition is desired. LinkedIn editorial artwork remains unbranded when they are absent.
6. Public LinkedIn publication remains a human action after Publisher approval/package preparation; Munin records the resulting URL rather than silently posting.
7. Credentials, OAuth grants, 2FA, paid-service activation and irreversible consequential actions remain explicit human boundaries.

## Follow-on hardening opportunities (not v0.1 blockers)

- If a supported first-party ChatGPT deep-link/action mechanism becomes available, replace the clipboard handoff with that mechanism without introducing API billing or credential leakage.
- Expose additional ChatGPT-facing control surfaces only when they preserve the existing authorization and consequence boundaries.
- Add richer optional-provider latency/retry observability if runtime evidence shows operator value.
- Promote Serena or another semantic backend only if the existing benchmark proves material improvement over native repository intelligence.
- Expose a standards-compliant external MCP transport around the existing internal Munin MCP bridge if a real external client requires it.

## Guardrails

- No automatic public publication without explicit approval.
- No material paid service dependency without explicit approval.
- ChatGPT subscription access must never be treated as OpenAI API entitlement.
- Prefer zero-additional-cost tooling where viable.
- Preserve model/provider portability.
- Local AI remains opt-in and must not consume host resources silently.
- Operator handoff payloads must never include tokens, OAuth credentials, API keys or raw secret stores.
- Do not persist transient screenshots, credentials or private document contents in Git.
- Reversible technical decisions may proceed autonomously when consistent with accepted principles.
- While a safe, reversible, executable next action exists, the Orchestrator continues without requiring `cont`, `next`, or `build` from the user.
