# Munin Canonical Backlog

## HUD Mobile Layout — completed 2026-08-22

- [x] Replace compressed desktop HUD with a dedicated single-column mobile composition.
- [x] Remove overlapping orbit nodes and ambient canvases from small screens.
- [x] Keep feed, career, chrono and activity readable in natural scroll order.
- [x] Contain the command composer within iPhone width and safe-area bounds.

## Unified Mobile UI — completed 2026-08-22

- [x] Five-destination mobile navigation shared by Home and standalone modules.
- [x] Mobile-safe React Command Center without fixed desktop minimum width.
- [x] Decision-oriented Action Inbox with context, recommendation and impact.
- [x] Loading skeletons, retry states, success feedback and useful empty states.
- [x] Compact execution timeline and semantic status language.

> Repo-backed execution queue for Munin. Priorities are P0 highest to P3 lowest.
>
> Last updated: 2026-08-27

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
- [x] **Native/share-sheet UX completion (repository side)** — web quick intake supports URL/text/paste/drop screenshots and analysis-before-commit; the iOS Shortcut/Share Sheet contract is fully documented in `docs/product/career-share-sheet.md`. Installation and device acceptance on the target iPhone remain empirical human/device validation, not missing repository code.
- [x] **Governed Career Application Packets** — persist bounded role text and prepare ATS terms, governed profile evidence, CV prompts, a placeholder-safe cover letter and interview preparation; human review is mandatory and automatic submission remains disabled.

## P1 — Munin v0.1

- [x] Project portfolio intelligence foundation.
- [x] Persistent context and memory foundations.
- [x] `SITREP`, `BUILD`, `CONT`, `NEXT`, and `EXECUTE` command semantics.
- [x] Career operations/intelligence foundation.
- [x] Repository state visibility foundations.
- [x] **Munin v0.1 product specification and implementation plan consolidation** — current product contract, trust boundaries, capability map, acceptance criteria and remaining integration sequence are canonical in `docs/product/`.

## P1 — Integrations and operator experience

- [x] **Waiting For / Follow-up Engine** — derives pending replies, stale opportunities and due follow-ups from read-only email/career state without automatic sending.
- [x] **Read-only intelligent agenda foundation** — merges due P0 actions and follow-ups into Today; external calendar remains an explicit OAuth boundary.
- [x] **Approval Center / Trust Receipts projection** — centralizes required decisions, waiting Manus tasks and reply reviews with impact and evidence before action.
- [x] **People Intelligence foundation** — projects recruiter and hiring-manager relationship context, last contact, stage and next action from Career state.
- [x] **Agent Session Analytics** — summarizes orchestration success, attempts and engineering-job outcomes from local runtime evidence.
- [x] **Approval-first Browser Plans** — represents fixed inspect/prepare/approve steps while keeping the current browser surface non-mutating by default.
- [x] **Morning Brief + Evening Review** — deterministic proactive summaries combine Today, Waiting For and execution evidence without paid inference.

- [x] **Manus Operational Bridge** — bounded Manus API v2 task delegation and result polling, daily task/credit budget, Action Inbox projection and a Windows startup worker; no key or prompt secret is committed.
- [x] **Governed automatic main deployment** — one typed `deploy-main` Host Bridge action performs clean-main fast-forward, full verification, supervised restart and health check without exposing arbitrary shell access.
- [x] **Clean deployment invariant** — the Host Bridge removes only reproducible `dist`/`dist-web` artifacts before and after verification so every successful deployment leaves `main` clean for the next intent.
- [x] **Remote Host receipt** — completed, blocked and failed GitHub Host Inbox jobs publish one sanitized `host-result.json` receipt to the dedicated `munin-host-outbox` branch, eliminating routine desktop inspection.

- [x] **Munin Radar + unified Action Inbox** — aggregate trusted regulatory changes, workspace actions and actionable email/career signals into visible operator lanes; expose connector health and preserve explicit approval for consequential actions.
- [x] **Mobile-first command access** — Action Inbox and Radar are directly reachable through shared navigation and keyboard shortcuts without adding a heavy UI framework.
- [x] **Mobile-first global Command Palette** — every standalone Munin surface exposes a bottom-sheet command launcher on phones plus `Ctrl/Cmd+K`, search and direct access to the highest-value operating modules.
- [x] **n8n-inspired visual flow viewer** — a read-only, dependency-free flow surface renders real orchestration traces, routing, provider attempts and terminal outcomes without creating a second workflow engine.
- [x] **Operational chat workspace** — a full local command conversation surface reuses Assistant history/API and provides an explicit sanitized handoff to the existing ChatGPT session for free-form reasoning.

- [x] **Unified operator workflow** — `munin start|build|verify|ship|doctor|mobile-test` replaces repeated PowerShell/GitHub choreography with fixed, auditable commands; `ship` verifies before push, reuses a single mission PR, creates drafts only when needed, never stages unrelated files and never merges automatically.
- [x] Mobile-first Munin runtime/API foundation.
- [x] GitHub-backed execution path and autonomous engineering delivery foundation.
- [x] Zero-additional-cost Ollama provider fallback foundation.
- [x] **Local Video Generation capability / MiniMax H3 evaluation** — `media.local-video` is implemented as a disabled-by-default, provider-neutral runner seam with no automatic model downloads, explicit license/hardware gate, health/plan/generate actions and a host benchmark CLI. Current upstream H3 artifacts are materially larger than the old ~42.5 GB backlog estimate, so H3 model installation is deliberately not automatic. Actual model/license acceptance and host quality/speed benchmarking are empirical promotion evidence before selecting H3 as a normal route; see `docs/research/LOCAL_VIDEO_MINIMAX_H3_EVALUATION_2026-08-18.md`.
- [x] **LinkedIn Content Intelligence foundation** — content engine, trusted-source radar, editorial identity, composer, history, council review and visual-asset flows exist.
- [x] **LinkedIn Publisher completion** — governed Publisher API/UI requires explicit approval, prepares a manual publication package, supports revocation, and records a LinkedIn URL only after explicit manual-publication confirmation. Automatic public posting remains intentionally disabled.
- [x] **Brand Asset Registry** — canonical AJ/Munin asset registry and no-approximation policy merged; exact master files remain human-supplied assets.
- [x] **Remote access/runbook consolidation** — canonical Windows local/runtime/Tailscale/recovery procedure is documented in `docs/REMOTE_LOCAL_RUNBOOK.md`, including stale-port diagnosis that caused old Vite UIs to be reused.

## P1 — Architecture and research

- [x] **AIP consolidation** — historical AIP RFC/SPEC/BUILD/ADR concepts are mapped into the canonical Munin v0.1 architecture in `docs/architecture/AIP_TO_MUNIN_V01_MAP.md`; AIP is no longer a parallel implementation backlog.
- [x] Establish multi-agent roles only where responsibilities, independent QA, and durable-state write-back are explicit.
- [x] **GitHub ecosystem scan — 2026-08-18 cycle** — current Playwright, Serena, MCP SDK, DeepSeek Harness, OpenAI Agents SDK, LangGraph and local-media candidates were compared in `docs/research/GITHUB_ECOSYSTEM_SCAN_2026-08-18.md`. No replacement materially justified migration risk today; future scans are trigger-based rather than a permanently open task.
- [x] **GitHub ecosystem scan — 2026-08-27 cycle** — daily/weekly/monthly momentum was filtered through Munin's evidence, cost, privacy and duplication gates. Career packet and safety patterns were adapted natively; Archify remains a benchmark candidate and competing orchestrator/memory products were rejected. See `docs/research/GITHUB_ECOSYSTEM_SCAN_2026-08-27.md`.

## P2 — Hardening

- [x] **Daily briefing intake — 2026-08-25** — mapped Agent Safety Gate to the existing Action Constitution, added bounded Audit Replay retrieval, promoted explicit `whyItMatters`/recommendation/impact fields in Action Inbox, added FEBRABAN to the trusted Radar and preserved two follow-on LinkedIn themes in Content Intelligence.
- [x] **Agent safety, isolation and observability** — isolated workspaces, guarded/strict sandbox backends, adversarial policy benchmark, durable traces/metrics, local telemetry and replay receipts are integrated; Windows npm/npx and recursive secret-redaction regressions are covered.

- [x] **Control Room cross-run continuity acceptance** — deterministic acceptance proves objective execution writes canonical state/session evidence and a fresh runtime rehydrates it.
- [x] **Engineering end-to-end acceptance** — deterministic Control Room acceptance exercises production Product State, QA, Memory Curator and Operator boundaries while replacing only the external-mutating Engineer; it proves missing evidence triggers Engineer → QA recovery, corrected evidence passes QA, durable write-back occurs and the Operator closes healthy.
- [x] Failure recovery, bounded retry, leases/fencing/outbox and idempotent runtime primitives exist.
- [x] Provider policy and bounded execution/cost-control foundations exist.
- [x] **Historical conversation ingestion privacy review** — relevance, provenance, local-storage and secret-rejection boundaries are implemented and documented.
- [x] **External connector security/privacy review** — Gmail/Outlook permission inventory and consequential-action boundary are documented; OAuth authorization/refresh now asserts the repository-managed scopes remain read-only.
- [x] **Secure token-at-rest adapter** — OAuth token storage auto-selects macOS Keychain, Linux Secret Service or Windows DPAPI scoped to the current Windows user; required-secure mode fails closed, legacy plaintext token fields are migrated out of runtime JSON when secure storage is available, status reports only the storage kind, and Windows DPAPI receives token plaintext over stdin rather than process arguments.
- [x] Execution/retry/blocker observability foundations and optional read-only Sentry ingestion exist.
- [x] **Consolidated operator-facing observability/SITREP** — one deterministic snapshot aggregates canonical Control Room readiness, engineering job health, Playwright verification availability/read-only policy, Memory Ledger volume and connector security state; exposed via CLI and `/api/orchestrate/status`.

## Empirical / human-boundary acceptance remaining

These are not unchecked software backlog items because they cannot be truthfully completed in repository code alone:

- Install the documented **Enviar vaga ao Munin** iOS Shortcut on the target phone and validate URL + screenshot Share Sheet behavior on-device.
- If MiniMax H3 is to be promoted, review/accept the current upstream model license, deliberately install the chosen backend/weights and run `npm run video:benchmark` on the actual Munin host; keep another backend if H3 is not viable.
- Supply exact canonical AJ/Munin brand master files where exact-asset composition is desired; generated editorial LinkedIn imagery remains unbranded by default.
- Public LinkedIn publication itself remains an explicit human action; Munin may prepare, approve, copy and record but not silently publish.
- OAuth/2FA/credential grants and other consequential external permissions remain human boundaries.

## Done in current phase

- [x] Control Room architecture, durable state, autonomous loop, multi-agent supervisor and production specialist adapters.
- [x] CLI and API objective entrypoints.
- [x] Governed browser verification and skill-aware autonomous engineering.
- [x] Memory Ledger, governed/secret-safe ChatGPT project-memory promotion and Career Mobile Intake core.
- [x] Control Room cross-run continuity and engineering QA-recovery acceptance.
- [x] Canonical Munin v0.1 product/build contract.
- [x] Read-only external OAuth connector security contract.
- [x] Cross-platform OS-backed OAuth token-at-rest adapter including Windows CurrentUser DPAPI.
- [x] Unified operator SITREP across core runtime surfaces.
- [x] Canonical Brand Asset Registry and unbranded-by-default LinkedIn editorial policy.
- [x] Career Quick Intake web surface + iOS Share Sheet contract.
- [x] Governed LinkedIn Publisher.
- [x] Provider-neutral local-video seam and MiniMax H3 evaluation/benchmark harness.
- [x] Remote/local operator runbook.
- [x] AIP → Munin v0.1 consolidation map.
- [x] August GitHub ecosystem scan with trigger-based future reevaluation.
- [x] Daily Munin progress/blocker review automation created in ChatGPT.
