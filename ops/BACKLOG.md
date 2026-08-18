# Munin Canonical Backlog

> Repo-backed execution queue for Munin. Priorities are P0 highest to P3 lowest.
>
> Last updated: 2026-08-18

## P0 — Execution foundation

- [x] **Munin Control Room Protocol** — repo state is the durable source of truth across ChatGPT, Codex, Claude, local agents, and future providers.
- [x] **Autonomous Execution Harness** — `PLAN → BUILD → TEST → VERIFY → FIX` repeats until acceptance criteria are met or a real human blocker exists.
- [x] **Multi-agent Orchestrator** — routes objectives across Product/State, Researcher, Engineer, QA, Memory Curator, and Operator and recovers automatically when a safe next action exists.
- [x] **State hydration** — every execution session can read canonical state before acting.
- [x] **State write-back** — meaningful progress can update current state, backlog, session log, and durable memory.
- [x] **Real-blocker classifier** — distinguishes human-only blockers from issues the system can diagnose, retry, infer, or safely decide.
- [x] **Executor handoff contract** — standard task package for model/provider-neutral execution.
- [x] **Default specialist executor adapters** — production bindings connect state hydration, research, autonomous engineering, QA evidence gating, memory write-back, and operational handoff.
- [x] **Orchestrator Control Room entrypoint** — one canonical objective runtime hydrates state and invokes the multi-agent supervisor.
- [x] **Control Room CLI exposure** — `munin orchestrate <objective>` invokes the canonical supervisor.
- [x] **Control Room API exposure** — `/api/orchestrate` exposes the canonical runtime for web/mobile Control Room clients.
- [x] **Browser automation evaluation** — Playwright CLI was evaluated and promoted for governed read-only browser verification; mobile engineering can request browser-verified builds.
- [x] **Engineering skills evaluation** — model-agnostic TDD, systematic debugging, code-review and UI/UX methodology skills are integrated through the Skill Registry.
- [x] **DeepSeek Harness evaluation** — useful reversible capability-seam patterns were adapted natively without provider lock-in.

## P0 — Context continuity

- [x] **Canonical project memory foundation** — persist core Munin execution state, decisions, and session events outside individual chats.
- [x] **Memory Ledger** — append-only typed project memory with search, semantic deduplication, mobile read API, and durable event mirroring.
- [x] **Conversation export parser foundation** — ChatGPT export parsing exists as a structured ingestion primitive.
- [x] **Conversation ingestion promotion path** — reviewed historical ChatGPT records can be promoted into continuity memory + Memory Ledger with project provenance and an accepted/rejected report.
- [x] **Context relevance policy** — historical records require explicit Munin/project signals; unrelated personal identity/preferences and generic local context are not promoted to project memory by default.
- [x] **Historical secret hygiene** — private keys, credential-shaped tokens/passwords and OTP/2FA values fail closed before governed project-memory promotion.
- [x] **Session log** — concise execution events reconstruct work without replaying every chat.

## P0 — Career mobile intake

- [x] **Career Mobile Intake core** — accepts Share Sheet, URL, text, screenshot, and image inputs through `/api/mobile/career/intake`.
- [x] **Transient Vision extraction** — screenshots/images can be parsed through the configured multimodal provider without durable image storage.
- [x] **Normalization and deduplication** — career inputs become `JobOpportunity` records with fit scoring, provenance, fingerprints, and duplicate prevention.
- [x] **iOS contract** — `munin-career-intake-v1` capability discovery and Shortcuts/Share Sheet contract documented.
- [ ] **Native/share-sheet UX completion** — expose the intake flow in the chosen mobile shell without regressing the current Lovable workstream.

## P1 — Munin v0.1

- [x] Project portfolio intelligence foundation.
- [x] Persistent context and memory foundations.
- [x] `SITREP`, `BUILD`, `CONT`, `NEXT`, and `EXECUTE` command semantics.
- [x] Career operations/intelligence foundation.
- [x] Repository state visibility foundations.
- [x] **Munin v0.1 product specification and implementation plan consolidation** — current product contract, trust boundaries, capability map, acceptance criteria and remaining integration sequence are canonical in `docs/product/`.

## P1 — Integrations and operator experience

- [x] Mobile-first Munin runtime/API foundation.
- [x] GitHub-backed execution path and autonomous engineering delivery foundation.
- [x] Zero-additional-cost Ollama provider fallback foundation.
- [ ] **Local Video Generation capability / MiniMax H3** — evaluate and integrate as an optional provider-neutral media capability. Prefer DiffSynth-Studio NF4/VRAM-managed or ComfyUI-compatible execution; keep downloads opt-in (~42.5 GB class), enforce license territory/commercial-attribution constraints, and benchmark actual quality/speed on Munin host hardware before making it a default route. Treat local open-weight H3 as primarily 768p; do not claim the hosted 2K regeneration stage is locally available unless upstream releases it.
- [x] **LinkedIn Content Intelligence foundation** — content engine, trusted-source radar, editorial identity, composer, history, council review and visual-asset flows exist.
- [ ] **LinkedIn Publisher completion** — freshness/provenance is hardened; preserve explicit approval for public publication and finish the governed publishing surface.
- [x] **Brand Asset Registry** — canonical AJ/Munin asset registry and no-approximation policy merged; exact master files remain human-supplied assets.
- [ ] Remote access/runbook consolidation for the local Munin environment.

## P1 — Architecture and research

- [ ] Consolidate AIP RFC/SPEC/BUILD/ADR backlog and map components to Munin v0.1.
- [x] Establish multi-agent roles only where responsibilities, independent QA, and durable-state write-back are explicit.
- [ ] Continue GitHub ecosystem scan for reusable open-source components, replacing weaker backlog candidates when materially better options are found.

## P2 — Hardening

- [x] **Control Room cross-run continuity acceptance** — deterministic acceptance proves objective execution writes canonical state/session evidence and a fresh runtime rehydrates it.
- [x] **Engineering end-to-end acceptance** — deterministic Control Room acceptance exercises production Product State, QA, Memory Curator and Operator boundaries while replacing only the external-mutating Engineer; it proves missing evidence triggers Engineer → QA recovery, corrected evidence passes QA, durable write-back occurs and the Operator closes healthy.
- [x] Failure recovery, bounded retry, leases/fencing/outbox and idempotent runtime primitives exist.
- [x] Provider policy and bounded execution/cost-control foundations exist.
- [x] **Historical conversation ingestion privacy review** — relevance, provenance, local-storage and secret-rejection boundaries are implemented and documented.
- [x] **External connector security/privacy review** — Gmail/Outlook permission inventory and consequential-action boundary are documented; OAuth authorization/refresh now asserts the repository-managed scopes remain read-only.
- [ ] **Secure token-at-rest adapter** — evaluate OS keychain/credential-vault storage for local OAuth tokens; current v0.1 explicitly relies on local runtime JSON plus host OS/filesystem protection.
- [x] Execution/retry/blocker observability foundations and optional read-only Sentry ingestion exist.
- [ ] Consolidated operator-facing observability/SITREP across orchestrator, engineering jobs, browser verification and connector state.

## Done in current phase

- [x] Control Room architecture, durable state, autonomous loop, multi-agent supervisor and production specialist adapters.
- [x] CLI and API objective entrypoints.
- [x] Governed browser verification and skill-aware autonomous engineering.
- [x] Memory Ledger, governed/secret-safe ChatGPT project-memory promotion and Career Mobile Intake core.
- [x] Control Room cross-run continuity and engineering QA-recovery acceptance.
- [x] Canonical Munin v0.1 product/build contract.
- [x] Read-only external OAuth connector security contract.
- [x] Canonical Brand Asset Registry.
- [x] Daily Munin progress/blocker review automation created in ChatGPT.
