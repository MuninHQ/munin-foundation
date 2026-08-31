# Munin Session Log

## 2026-08-30 — NVIDIA Nemotron 3 Ultra optional provider

### Decision

- Integrated Nemotron 3 Ultra through the existing OpenAI-compatible provider seam instead of adding a second orchestrator or attempting an unsupported consumer-PC deployment.
- Kept ChatGPT-first, deterministic-local and Ollama behavior unchanged by default; NVIDIA activation and credentials remain explicit.
- Treated the hosted NVIDIA trial as quota-bound external inference, not as guaranteed free or unlimited infrastructure.

### Changes

- Added the official hosted endpoint/model preset, explicit `off`/`medium`/`full` reasoning control and model-profile visibility.
- Added request tuning for the official Nemotron chat template and stripped private/incomplete reasoning traces before downstream parsing or display.
- Marked the model text-only so Career screenshot intake does not waste quota or advertise false vision readiness.
- Documented hardware reality, privacy/cost boundaries, Windows setup and promotion criteria without downloading weights or adding dependencies.

### Evidence

- Focused Nemotron/settings/mobile tests passed: 9/9.
- Core TypeScript build passed.
- Vite production build passed.
- Full suite passed: 623 tests, 0 failures.
- Agent security benchmark passed: 12/12, score 100%.
- No live NVIDIA call was made because no user credential was available in this environment.

## 2026-08-27 — Build all + GitHub momentum integration

### Decisions

- Reconciled the canonical repository with `origin/main` and integrated the queued agent safety/observability branch without replacing Munin's orchestrator.
- Reviewed daily, weekly and monthly GitHub Trending through the zero-cost, duplication, privacy and evidence gates.
- Adapted the useful `ai-job-search` workflow as native governed Career Application Packets; did not import LinkedIn guest scraping, mandatory Claude/Bun/LaTeX or automatic submission.
- Retained Munin's current memory, browser and flow foundations instead of importing OpenViking, ai-memory, TencentDB Agent Memory, OpenHuman, Maka or Archify wholesale.

### Changes

- Career Intake now persists bounded role text and Career Command prepares ATS terms, governed evidence, CV prompts, a placeholder-safe cover-letter scaffold and interview preparation.
- Integrated worktree isolation, guarded/strict sandbox backends, adversarial security bench, durable traces/metrics, HUD readiness, local telemetry and replay receipts.
- Connected Control Room executions to secret-redacted JSONL telemetry and durable receipts while keeping observability failures non-fatal.
- Hardened Windows npm/npx execution through validated CLI entrypoints, recursive credential redaction, sandbox-status caching and HUD HTML escaping.

### Evidence

- Core TypeScript build passed.
- Vite production build passed.
- Full suite passed: 577 tests, 0 failures.
- Agent security benchmark passed: 12/12, score 100%.
- Sandbox doctor reported `native-guarded` available; Docker hard isolation remains an empirical Windows-host promotion gate.
- No new runtime dependency, paid service, provider lock-in or external write was introduced.

## 2026-08-25 — Windows Playwright health recovery

### Evidence

- On the updated Windows host, the original `execFile('playwright-cli.cmd', ['--help'])` probe reproduced `spawn EINVAL`.
- The installed npm shim resolved to `playwright-cli.cmd`; invoking its JavaScript entrypoint through `node.exe` succeeded only after disabling the optional npm update notifier with `NO_UPDATE_NOTIFIER=1`, preventing the CLI's reproducible Windows process assertion.
- The governed local validation then passed with Playwright available, two read-only snapshots, the permission gate blocked, and `playwright-cli` recommended. The full suite passed with 542 tests and 0 failures.

### Changes

- On Windows, Playwright CLI now resolves to its installed JavaScript entrypoint and executes through `process.execPath`, avoiding direct `.cmd` execution.
- Browser health, open, snapshot and close calls disable the optional CLI update check; no paid service or external inference was activated.
- Added deterministic regression coverage for both the Windows entrypoint resolution and the safe `.cmd` fallback.

### Engineering job investigation

- The two persisted failed jobs were created on 2026-08-15 and 2026-08-16, both with `changedFiles: []`, no active queue/running state, and terminal provider/network failures. They are historical runtime records, not a currently reproduced engineering defect.
- No new engineering mission was started because the current default ChatGPT-first runtime has no configured in-process provider and launching one could cross the explicit paid/provider boundary.

## 2026-08-25 — Content Studio navigation recovery

### Evidence

- The full repository gate passed after recovery: core TypeScript build, Vite production build and 538 automated tests with 0 failures.
- The built `dist-web/content-studio.html` was verified to resolve its Intelligence link to the existing `/intelligence.html` route.

### Changes

- Corrected the governed Content Studio header link from the nonexistent `/intelligence-studio.html` route to the existing Intelligence page.
- No new page, framework, provider, paid service or external mutation was introduced.

## 2026-08-22 — Dedicated HUD mobile route

- Replaced cache-sensitive responsive overrides with a new `/hud-mobile.html` entrypoint.
- Embedded authoritative mobile layout overrides directly in the new HTML route.
- Kept `/hud.html` as the desktop cinematic interface.

## 2026-08-22 — HUD mobile cache bust

- Confirmed from a second iPhone capture that cached HUD assets kept the desktop layout active.
- Versioned HUD CSS/JS URLs and widened mobile detection for coarse-pointer Safari viewports.

## 2026-08-22 — HUD mobile layout remediation

- Reproduced the overlap/cropping problem from the iPhone capture.
- Added a purpose-built HUD layout below 760px instead of scaling the desktop canvas.
- Preserved the cinematic desktop HUD while simplifying mobile effects and interactions.

## 2026-08-22 — Unified Mobile UI

- Removed the desktop-only minimum width from the React workspace.
- Added a shared bottom navigation and mobile action launcher.
- Redesigned Action Inbox around explanation, recommendation and consequence.
- Added skeleton, retry, empty, toast and execution-timeline states.
- Preserved approval-first behavior and avoided new external mutations.

> Append concise, durable execution events. This is not a transcript archive.

## 2026-08-25 — Daily briefing promoted into Munin

- Confirmed the existing Action Constitution already provides the Agent Safety Gate for external and destructive actions.
- Added bounded read-only Audit Replay over the append-only local action log; replay cannot execute actions.
- Replaced generic Action Inbox explanation fallbacks with structured why-it-matters, recommendation and impact fields.
- Added FEBRABAN as a governed industry-association source in the Trusted Source Radar.
- Saved two editorial territories in LinkedIn Content Intelligence: agent containment and tokenized settlement infrastructure.

## 2026-08-22 — Proactive Operator Hub

### Changes

- Added deterministic Waiting For detection across actionable mail and stale/due Career follow-ups.
- Added Today agenda projection, People Intelligence, centralized approvals and approval-first browser plans.
- Added agent session analytics from orchestration traces and engineering outcomes.
- Added Morning Brief and Evening Review without requiring a paid or local LLM.
- Kept calendar integration read-only and explicitly disconnected until the user grants OAuth.

## 2026-08-22 — GitHub-inspired UX completion

### Decision

Complete the full recommendation set originally derived from public-apis, n8n and modern command/chat products without importing a heavy framework or paid runtime.

### Changes

- Added a global phone-first command bottom sheet with search and `Ctrl/Cmd+K` parity.
- Added a read-only visual flow page backed by real orchestration traces; the existing Munin orchestrator remains authoritative.
- Added a full operational chat page backed by the deterministic Assistant API/history and the sanitized ChatGPT Operator Bridge.
- Preserved local-first behavior, zero additional cost, explicit consequential-action boundaries and no mandatory local LLM.

## 2026-08-22 — Remote deployment acceptance hardening

### Evidence

- A real `deploy-main` Host Inbox intent completed on Windows with 507/507 tests, supervised restart and HTTP 200 API/Web health.
- The first empirical attempt exposed Windows `npm.cmd` `spawn EINVAL`; execution now uses `node.exe` with an absolute validated `npm-cli.js` path while keeping `shell:false`.

### Changes

- Added deterministic cleanup of only `dist` and `dist-web` around deployment verification so generated output does not dirty the next release.
- Added a dedicated GitHub Host Outbox that publishes one redacted receipt file for terminal remote jobs.
- Kept branch, filename, commands, repository and secret redaction fixed; arbitrary shell and credential prompting remain disabled.

## 2026-08-22 — Manus bidirectional operational bridge

### Existing state preserved

- Manus Desktop was already installed on Windows.
- `munin-foundation-git` was already authorized in My Computer.
- Earlier Manus repository diagnosis and remote OAuth remediation were not repeated.

### Changes

- Added bounded Manus API v2 task creation, persistent local task state and asynchronous result polling.
- Added allowlisted task kinds, Lite profile default, daily task cap and declared-credit budget.
- Added Manus Operator web surface, connector health and Action Inbox projection.
- Added reversible Windows startup scripts for the Manus result worker.
- Extended the typed Host Bridge with `deploy-main`: clean `main` fast-forward, full verification, supervised restart and health check.
- Preserved fail-closed boundaries for dirty checkout, non-main branch, test failure, stale supervisor, credentials and consequential external actions.

### Validation

- TypeScript core build passed.
- Vite production build passed and emitted `manus.html`.
- Full suite passed: 507 tests, 0 failures.

## 2026-08-21 — Unified operator workflow implemented

### Decision

Replace repeated PowerShell, Git and pull-request choreography with one bounded Munin operator command surface while preserving explicit human control over merge and consequential actions.

### Changes

- Added `munin start`, `build`, `verify`, `ship`, `doctor` and `mobile-test`.
- Kept subprocess execution fixed and shell-free; no arbitrary command input is accepted.
- Made `ship` refuse `main`, refuse uncommitted changes, run the full verification gate, push only the current mission branch and reuse an existing open PR before creating one draft PR.
- Kept staging, commit content selection and merge outside the command so unrelated files cannot be silently included and final promotion remains human-controlled.
- Added deterministic tests for diagnostics, build/verify routing and PR-consolidation guardrails.

### Remaining empirical acceptance

- Run the one-shot bootstrap on the target Windows host, then exercise `munin doctor` and `munin mobile-test` on the actual PC/iPhone path.

## 2026-08-17 — Control Room architecture initiated

### Decision

Adopt a persistent Control Room operating model so Munin execution does not depend on reopening and reconstructing individual chats.

### Changes

- Defined repo-backed durable operational state.
- Defined `BUILD`, `CONT`, `SITREP`, and `NEXT` command semantics.
- Defined the autonomous engineering loop: `PLAN → BUILD → TEST → VERIFY → FIX`.
- Defined criteria for real human blockers versus recoverable execution issues.
- Created canonical current-state and backlog documents.
- Established a provider-agnostic executor model covering ChatGPT, Codex, Claude, local models, and future providers.

### Next

Create the accepted decision record, align portfolio ownership language, and implement the executor handoff/state hydration contracts.

## 2026-08-17 — Multi-agent Orchestrator implemented

### Decision

Promote Munin from command-by-command execution to objective-level orchestration. The supervisor continues while a safe, reversible, executable next action exists and escalates only human-only blockers.

### Changes

- Added executable multi-agent registry and orchestration core.
- Added Product/State, Researcher, Engineer, QA/Verifier, Memory Curator, and Operator roles under the Munin Orchestrator.
- Added automatic work classification and specialist routing.
- Added QA repair loop: failed verification returns directly to Engineer and then QA again.
- Added retry behavior for recoverable blockers and explicit human-only classification for credentials, 2FA, financial commitments, irreversible high-impact actions, permission barriers, and unresolved strategic ambiguity.
- Added automated tests covering routing, recovery, QA repair, and escalation.
- Updated canonical backlog and current state.

### Next

Validate through repository CI, bind specialist roles to production runtime adapters, and expose one Control Room objective entrypoint.

## 2026-08-18 — OAuth token-at-rest hardening completed

### Decision

Prefer OS-backed credential storage for repository-managed OAuth tokens without broadening external permissions or adding a paid/runtime dependency. Preserve explicit fallback behavior instead of making unsupported hosts fail unexpectedly.

### Changes

- Added a provider-neutral OAuth token-store seam.
- Added macOS Keychain and Linux Secret Service adapters.
- Added `auto`, explicit `json`, and fail-closed `keychain` policies.
- Added legacy runtime-JSON token migration when secure storage is active.
- Kept PKCE pending state local and kept token values out of status/log/memory surfaces.
- Extended operator connector status with the active storage kind.
- Added deterministic adapter/security-policy tests and updated the external connector security contract.
- First CI attempt found an Operator SITREP fixture type mismatch; corrected the fixture and reran validation.
- Final validation passed core build, web build, test suite and Markdown checks.
- Squash-merged PR #224 to `main`.

### Next

Continue with remote/local execution runbook consolidation, AIP-to-v0.1 mapping and safe publisher completion while preserving Lovable/publication boundaries.

## 2026-08-18 — v0.1 executable backlog closed

### Decision

Close repository-software backlog items when their implementation and governed operator contract are complete, while keeping real device, credential, license, hardware benchmark and public-publication observations as explicit empirical/human boundaries rather than pretending repository code can satisfy them.

### Changes

- Added governed LinkedIn Publisher state/API/UI with explicit approval, revocation, manual publication package and post-URL recording; automatic external publication remains disabled.
- Removed residual AJ/monogram instructions from LinkedIn Studio visual-profile memory and locked unbranded-by-default prompts with regression tests.
- Completed Career Quick Intake web exposure and documented the iOS Share Sheet/Shortcut contract for URL, selected text and transient screenshot inputs.
- Consolidated the Windows/local/Tailscale operator runbook, including stale `5173`/`4310` process recovery after the old Vite-instance issue was reproduced during live use.
- Consolidated historical AIP RFC/SPEC/BUILD/ADR concepts into Munin v0.1 and converted the product roadmap file into an index of canonical execution state instead of a competing backlog.
- Completed the August GitHub ecosystem scan and converted future ecosystem research to trigger-based reevaluation; no candidate materially justified replacing the current orchestrator/runtime stack in this cycle.
- Added provider-neutral `media.local-video`, disabled by default, with no automatic weight download, absolute local runner boundary, planning/health operations and a host benchmark CLI.
- Recorded current MiniMax H3 evaluation/license/storage/hardware promotion gates without installing model weights or claiming host performance without evidence.
- Added/extended regression tests for LinkedIn Publisher governance, unbranded editorial prompts and local-video runtime policy.
- Updated `ops/BACKLOG.md` so the current v0.1 phase has no unchecked repository-software items.
- Updated `ops/CURRENT_STATE.md` to `v0.1 backlog closeout / empirical acceptance` and enumerated the remaining real human/device boundaries.

### Remaining empirical acceptance

- Install and validate the iOS Career Share Sheet Shortcut on the target phone.
- If H3 is to be promoted, explicitly review/accept the model license, install the chosen local backend/weights and benchmark the actual host using `npm run video:benchmark`.
- Supply exact brand master assets if exact-asset composition is desired.
- Public LinkedIn posting, OAuth/2FA/credentials, paid activation and irreversible external actions remain human-controlled.

### Validation note

The implementation and deterministic tests are present in the repository. A fresh full local/CI run for this final multi-commit batch still requires executable CI or the canonical Windows checkout; no green result is inferred without evidence.

## 2026-08-18 — Windows OAuth DPAPI hardening

### Decision

Close the remaining zero-cost Windows token-at-rest gap with the operating system's CurrentUser DPAPI instead of leaving Windows on plaintext runtime JSON by default.

### Changes

- Added `windows-dpapi` as a secure OAuth token storage kind.
- Auto mode now probes and prefers Windows DPAPI on `win32` alongside macOS Keychain and Linux Secret Service.
- Token plaintext is supplied to PowerShell over stdin; it is not placed in process arguments.
- Only the DPAPI-encrypted blob is persisted in the runtime data directory and is tied to the current Windows user context.
- Required-secure mode fails closed if DPAPI cannot complete a round-trip probe.
- Added deterministic mocked DPAPI tests so Linux CI can verify selection, stdin handling and round-trip behavior without requiring a Windows runner.
- Removed the Windows JSON-fallback hardening item from current-state follow-ons and updated the canonical backlog.

### Validation note

The DPAPI implementation still requires the same final full-batch build/test evidence as the rest of this closeout; no green result is inferred from source edits alone.
## 2026-08-22 — Munin Radar and Action Inbox

### Decision

Adapt high-value patterns from changedetection.io, public-apis, n8n and command-palette products natively instead of importing another orchestration platform or adding a paid/heavy runtime dependency.

### Changes

- Added a deterministic unified Action Inbox with `Agora`, `Revisar`, `Executando`, `Concluído` and `Radar` lanes.
- Aggregated canonical workspace actions, actionable Gmail/Outlook career signals and trusted-source regulatory signals.
- Added Munin Radar UI/API with explicit refresh, provenance, relevance, freshness and source health.
- Added a zero-cost Connector Registry exposing authentication and health without credentials.
- Added mobile-responsive standalone surfaces, shared navigation entries and command shortcuts.
- Reused the existing Trusted Source Radar, intelligence timeline, ChatGPT Operator Bridge and governed LinkedIn composer rather than duplicating those capabilities.
- Added deterministic unit and navigation coverage.

### Validation

- Core TypeScript build passed.
- Vite production build passed and emitted both new pages.
- Full suite passed: 502 tests, 0 failures.
