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
## 2026-09-24 — Token Efficiency v1 shadow mode

### Decision

Add token/context efficiency as a disabled-by-default observation layer on existing telemetry and orchestration seams. Keep provider selection, agent execution, Promotion Gate outcomes and live context unchanged.

### Changes

- Added safe configuration, normalized usage quality, a deterministic advisory tier classifier and non-enforcing task/session budgets.
- Added redacted structured compaction, idempotent fresh-session checkpoints and projected savings reports.
- Integrated optional observations with Control Room agents, Host Worker completion, workspace-supervisor health and Capability Promotion benchmarking.
- Preserved zero-cost, Windows, provider independence and fail-open productive execution.

### Validation

Focused RED/GREEN evidence is recorded per task in the ignored execution ledger. Complete build and regression results remain pending the final verification task; no full-suite result is inferred here.


## 2026-09-08 — Research Fabric Wave 1

### Decision

- Keep Wave 1 read-only and disabled by default behind MUNIN_RESEARCH_FABRIC_V1.
- Use public zero-cost Web/RSS/GitHub sources and local yt-dlp for YouTube without credentials.
- Block private-network targets and revalidate redirects before external reads.

### Changes

- Added source adapters, normalization, bounded fallback routing and a source doctor.
- Added Web/RSS SSRF and response-size guards, anonymous GitHub REST support and shell-free YouTube execution.
- Installed yt-dlp 2026.07.04 on the Windows host via winget for empirical YouTube readiness.

### Validation

- Focused Research Fabric suite passed: 8 tests, 0 failures.
- Full repository suite passed: 788 tests, 0 failures.
- Source Doctor reported Web, RSS, GitHub and YouTube healthy after host setup.

## 2026-09-08T20:04:23.504Z — MEMORY PRE-TASK · ^Munin^ Research^ Fabric^

Task: ^Fix^ Research^ Fabric^ YouTube^ search^ buffer^
Consumer: assistant
Context matches: 0
Vault matches: 0

## 2026-09-08T20:05:04.629Z — MEMORY POST-TASK · ^Munin^ Research^ Fabric^

^YouTube^ search^ now^ uses^ flat^ playlist^ metadata,^ preventing^ yt-dlp^ stdout^ overflow;^ live^ search^ succeeded^ after^ the^ change.^
## Decisions

- ^Use^ --flat-playlist^ only^ for^ YouTube^ search^
- Keep^ direct^ video^ reads^ unchanged^ and^ read-only^

## Changed

- src/research-adapters.ts^
- tests/research-fabric.test.ts

## Next steps

- ^Ship^ fix^ through^ PR^ and^ redeploy^ main^
- Repeat^ live^ Wave^ 1^ smoke^ test^ after^ merge^

## What did not work

- ^Initial^ live^ YouTube^ search^ exceeded^ the^ 2^ MB^ stdout^ buffer^

## 2026-09-23T15:23:52.900Z — MEMORY POST-TASK · munin-foundation

^Reconciled^ PRs^ 370^ and^ 371^ onto^ current^ main^ in^ isolated^ worktree,^ fixed^ three^ Important^ independent-review^ findings^ with^ RED-to-GREEN^ regressions,^ opened^ PR^ 372,^ and^ confirmed^ six^ hosted^ checks^ green.^
## Decisions

- ^Use^ consolidated^ PR^ 372^ instead^ of^ rewriting^ stacked^ PR^ branches^
- Keep^ both^ governance^ systems^ observation-only^
- Require^ explicit^ merge^ authorization^

## Changed

- ^Design^ Constitution^ and^ Agent^ Control^ Plane^ reconciled^ onto^ ef61fad^
- Observer^ detects^ trust^ overlap,^ missing^ forbidden^ actions,^ missing^ promotion^ policies,^ and^ disabled^ consequential^ gate^
- Design^ drift^ report^ confined^ to^ .artifacts^

## Next steps

- ^Merge^ PR^ 372^ after^ explicit^ approval^
- Then^ close^ superseded^ PRs^ 370^ and^ 371^
- Address^ deferred^ minor^ observation-tooling^ items^ separately^

## What did not work

- ^One^ full-suite^ heartbeat^ timing^ test^ failed^ once^ and^ passed^ isolated^ plus^ full^ rerun;^ no^ related^ code^ changed^

## 2026-09-28T16:13:36.412Z — MEMORY PRE-TASK · munin-foundation

Task: ^Munin^ Token^ Efficiency^ v2^ and^ Codex^ Web^ Zero^ Risk^
Consumer: assistant
Context matches: 3
Vault matches: 8

## 2026-09-28T16:51:50.970Z — MEMORY POST-TASK · munin-foundation

^Implemented^ bounded^ context,^ output^ reduction,^ test^ failure^ extraction,^ lazy^ capabilities,^ economic^ routing,^ compact^ Build^ State,^ diff-first^ review,^ separate^ efficiency^ telemetry,^ manual-only^ Zero^ Risk^ handoff,^ diagnostics^ and^ runtime^ verification.^
## Decisions

- ^Extend^ Token^ Governor^ through^ focused^ deterministic^ modules^
- Keep^ Provider^ Registry^ authoritative^
- Keep^ Codex^ Web^ copy/open^ manual-only^

## Changed

- ^Efficiency^ runtime^ and^ tests^
- CLI^ API^ and^ UI^ diagnostics^
- Scoped^ AGENTS^ guidance^
- Supervised^ API^ child^ ownership^

## Next steps

- ^Collect^ representative^ local^ efficiency^ evidence^ before^ any^ routing^ promotion^

## What did not work

- ^Initial^ controlled^ restart^ reused^ an^ orphaned^ API;^ fixed^ direct^ child^ ownership^ and^ verified^ generation^ 5^

## 2026-10-01T15:57:28.786Z — MEMORY PRE-TASK · Munin

Task: ^Consolidate^ unpublished^ Munin^ changes^ safely^
Consumer: assistant
Context matches: 4
Vault matches: 8

## 2026-10-01T16:15:37.587Z — MEMORY POST-TASK · Munin

^Recovered^ efficiency^ v2^ and^ Automaton^ consolidated^ in^ isolated^ review^ branch;^ 910^ Munin^ and^ 1657^ Automaton^ tests^ pass;^ missing^ delta^ and^ skill^ gate^ artifacts^ documented^
## Decisions

- ^Automaton^ automatic^ routing^ quarantined^
- Observation^ remains^ advisory^
- No^ main^ merge^

## Changed

- ^consolidation/2026-10-01^ published^
- Safety^ regressions^ repaired^
- Provenance^ SITREP^ documented^

## Next steps

- ^Review^ draft^ PR^ and^ CI^
- Recover^ missing^ gate^ sources^
- Reconcile^ Offer^ Architect^ separately^

## What did not work

- ^Gate^ da54dde^ not^ found^
- Node24^ SQLite^ ABI^ mismatch^ resolved^ using^ existing^ Node22^
- Whole^ repository^ Markdown^ debt^ persists^

## 2026-10-01T16:23:55.875Z — MEMORY PRE-TASK · yt-lab

Task: ^Moneyprinter^ local^ MVP^ Wan2GP^ FFmpeg^ hardware^ validation^
Consumer: assistant
Context matches: 0
Vault matches: 5

## 2026-10-01T16:45:10.185Z — MEMORY POST-TASK · yt-lab

Offline_CPU_pilot_23.83s_ptBR_TTS_5_scenes_passed_862_Munin_tests_and_11_regressions_independent_review_pass
## Decisions

- CPU_only_zero_paid_API_no_download_no_publication_optin_existing_video_seam

## Changed

- scripts/moneyprinter-local,scripts/moneyprinter-local-runner.mjs,tests/moneyprinter-local.test.ts,docs/integrations/moneyprinter-local.md

## Next steps

- Wan2GP_live_MCP_and_model_benchmark_pending_reviewed_installation_and_free_VRAM

## What did not work

- Fixed_done_artifact_recovery_atomic_import_provenance_caption_bounds_atomic_JSON
## 2026-10-08T22:41:40.210Z — MEMORY PRE-TASK · career

Task: Improve career command reliability and job search UX
Consumer: assistant
Context matches: 0
Vault matches: 0

## 2026-10-08T22:54:28.467Z — MEMORY POST-TASK · career

Delivered career workbench and discovery/lifecycle fixes; 899 tests plus browser acceptance passed; Windows device offline
## Decisions

- Keep existing local stores and free operation
- Separate opportunity capture from application submission
- Preserve pipeline during optional integration failure

## Changed

- Career Command UI
- Job discovery and email identity
- Lifecycle validation and activity freshness

## Next steps

- Review branch and deploy on Windows when connected
- Verify private mailbox and actual iPhone

## What did not work

- Windows runtime acceptance unavailable because device offline

## 2026-10-08T23:04:03.546Z — MEMORY PRE-TASK · career

Task: Expand job alert emails into individual opportunities with reliable ingestion
Consumer: assistant
Context matches: 0
Vault matches: 2

## 2026-10-08T23:10:13.258Z — MEMORY POST-TASK · career

Delivered full Gmail/Outlook alert extraction, independent vacancies, stable LinkedIn URL identity, imported-association preservation, body caching and incomplete-alert health. Full suite: 914 passed; frontend types and browser acceptance passed. Windows remains offline.
## Decisions

- Keep deterministic email ingestion and existing 15-minute worker
- Do not automate LinkedIn accounts or submit applications
- Treat missing identity and unparsed layouts as incomplete

## Changed

- Career alert parser and provider integration
- Independent imports and URL duplicate reuse
- Career Command source health and regression coverage

## Next steps

- Install reviewed branch on Windows when online
- Validate representative private LinkedIn alerts and configured daily email delivery

## What did not work

- Initial API fixture reused module-scoped store from previous temporary directory; isolated module corrected
- Initial full suite redirected web build away from mobile launcher fixture; rerun with normal build passed

## 2026-10-08T23:14:30.434Z — MEMORY PRE-TASK · career

Task: Add reference-led visual motion to Career Command
Consumer: assistant
Context matches: 0
Vault matches: 7

## 2026-10-08T23:20:46.833Z — MEMORY POST-TASK · career

Implemented original animated vector header, score rings, card/detail transitions and persistent animation pause with system reduced-motion priority. Full build and 914 tests, frontend types and browser acceptance passed; design observation unchanged at 1401. Recorded synthetic-data preview; Windows install remains pending.
## Decisions

- Adapt Lusion/Linear/Rauno references without copying assets
- Use bounded SVG/CSS motion and existing semantic tokens
- Keep decorative art separate from real source health and job evidence

## Changed

- Career Command CSS/React visual motion
- Browser checks for pause persistence and reduced motion
- Reference and validation document

## Next steps

- Review actual motion preview
- Install reviewed branch and validate native iPhone performance when host is online

## What did not work

- Optional Playwright recording lacked its ffmpeg path; reused existing system ffmpeg and recording passed

## 2026-10-08T23:45:56.086Z — MEMORY PRE-TASK · Munin

Task: Repaginar toda interface e gravar navegação real
Consumer: assistant
Context matches: 0
Vault matches: 8

## 2026-10-09T00:06:39.656Z — MEMORY POST-TASK · Munin

29 telas repaginadas; 914 testes e aceitação real no navegador; vídeo de 172 segundos com dados fictícios
## Decisions

- Reutilizar tokens e componentes existentes
- Movimento global acessível sem dependência paga
- Preservar integrações e aprovações

## Changed

- Interface compartilhada e HUD
- Navegação completa e rotas de build
- Correções de carregamento e tipagem
- Validação e roteiro de gravação

## Next steps

- Instalar no Windows quando estiver online
- Validar contas privadas e iPhone físico

## What did not work

- Windows offline; aceitação no host pendente

## 2026-10-09T01:04:06.594Z — MEMORY PRE-TASK · munin

Task: HUD imersiva e constelação de memória sem voz
Consumer: assistant
Context matches: 0
Vault matches: 8

## 2026-10-09T10:52:20.639Z — MEMORY POST-TASK · munin

Implementada presença operacional compartilhada, HUD e Home reativas e constelação de memória com busca, filtros, rotação e navegação por teclado; 918 testes e aceitação das 29 rotas desktop/mobile passaram.
## Decisions

- Reutilizar renderizador e componentes existentes
- Relações do grafo representam fonte real, sem inferências
- Excluir conteúdo sensitive-private da visualização

## Changed

- HUD, Home e camada visual compartilhada
- Constelação de memória
- Testes de concorrência e aceitação no navegador

## Next steps

- Atualizar PR 384
- Validar instalação Windows e iPhone físico quando acessíveis

## What did not work

- Instalador CDN do navegador retornou payload inválido; navegador de teste obtido pelo pacote npm
- Aceitação no host Windows não executada

## 2026-10-09T12:20:13.554Z — MEMORY PRE-TASK · munin

Task: ^Install^ immersive^ Munin^ UI^ on^ Windows^ preserving^ local^ work^
Consumer: assistant
Context matches: 4
Vault matches: 8

## 2026-10-09T12:24:19.162Z — MEMORY POST-TASK · munin

^Installed^ immersive^ workspace^ on^ Windows;^ build^ and^ 954^ tests^ passed;^ 29^ browser^ routes^ and^ live^ UI^ smoke^ passed;^ API^ and^ supervisor^ running.^
## Decisions

- ^Preserve^ local^ Offer^ Architect^ and^ video^ runner;^ retain^ original^ data^ directory^ and^ startup^ shortcut^

## Changed

- ^Local^ installation^ branch^ with^ UI^ integration;^ workspace^ supervisor^ started^

## Next steps

- ^Use^ HUD^ and^ career^ workbench^ on^ Windows^

## What did not work

- ^Initial^ recall^ hit^ ENOTEMPTY;^ retry^ after^ build^ succeeded.^ Initial^ navigation^ contract^ conflict^ repaired^ and^ all^ tests^ passed.^

## 2026-10-15T17:11:07.576Z — MEMORY PRE-TASK · munin

Task: ^Preserve^ local^ work,^ diagnose^ CI,^ refresh^ ops^ state^
Consumer: assistant
Context matches: 4
Vault matches: 8

## 2026-10-15T17:13:26.390Z — MEMORY POST-TASK · munin

^Published^ install/immersive-windows-20261009^ ^(04a44bd^);^ npm^ test^ 954/954;^ PR^ 389^ CI^ failure^ fixed^ on^ head^ b097619;^ munin-core^ main^ CI^ fails^ on^ Prettier^ format^ of^ vaga-munin.md^
## Decisions

- ^Do^ not^ commit^ dist-web^ build^ output^
- Leave^ local^ main^ untouched^

## Changed

- ^Nordic^ theme^ assets^ committed^
- CURRENT_STATE^ and^ BACKLOG^ refreshed^ 2026-10-15^

## Next steps

- ^Fix^ Prettier^ in^ munin-core^ issue^ template^
- Fix^ nordic-theme.js^ mojibake^
- Decide^ dist-web^ tracking^ policy^
## 2026-10-15T22:04:41.136Z — MEMORY POST-TASK · munin-foundation

^Validated^ GitHub^ access^ ^(ADMIN^),^ 29^ web^ pages,^ API^ and^ Mobile^ Vault^ login;^ fixed^ Action^ Inbox^ deferred-client^ hang,^ added^ portfolio/email-intelligence^ to^ Vite^ build,^ shared^ CSS^ interaction^ polish;^ PR^ #390^
## Decisions

- ^Load^ munin-client.js^ synchronously^ in^ Action^ Inbox^
- Use^ zero-specificity^ :where^(^)^ for^ shared^ polish^ CSS^

## Changed

- apps/web/action-inbox.html^
- apps/web/public/munin.css^
- apps/web/vite.config.ts^
- tests/unified-mobile-ui.test.ts

## Next steps

- ^Review^ and^ merge^ PR^ #390^
- Regenerate^ dist-web^ after^ merge^

## What did not work

- ^Service^ worker^ registration^ fails^ inside^ the^ in-app^ browser^ pane^ ^(environment,^ not^ reproduced^ elsewhere^)^

## 2026-10-15T22:29:03.775Z — MEMORY POST-TASK · munin-foundation

^Fixed^ HUD^ clock^ clipping^ and^ orbit^ nodes^ hidden^ under^ side^ panels;^ audited^ 28^ pages^ at^ 1366px^ and^ 375px;^ fixed^ mobile^ content^ hidden^ under^ quick-action^ button^ and^ colliding^ floating^ buttons^ on^ home;^ PR^ 390^
## Decisions

- ^Clamp^ HUD^ nodes^ to^ stage^ and^ above^ activity^ stream^
- Mobile^ pages^ reserve^ 124px^ bottom^ space^
- Home^ floating^ controls^ grouped^ bottom-right^

## Changed

- apps/web/public/hud.css^
- apps/web/public/hud.js^
- apps/web/public/munin.css^
- apps/web/src/styles.css

## Next steps

- ^Review^ and^ merge^ PR^ 390^

## What did not work

- ^Hidden^ browser^ pane^ freezes^ CSS^ transitions,^ so^ layout^ measurements^ need^ finished^ transitions^

## 2026-10-15T22:38:36.312Z — MEMORY POST-TASK · munin-foundation

^Applied^ restrained^ Apple^ design^ pass:^ size-aware^ heading^ tracking,^ antialiased^ optical-size^ type,^ saturated^ translucent^ materials,^ scroll-edge^ bar^ border,^ anchored^ More^ menu,^ reduced-transparency^ and^ increased-contrast^ support^ across^ shared^ pages,^ home^ and^ HUD;^ PR^ 390^
## Decisions

- ^Prefer^ craft^ details^ over^ new^ visual^ elements^
- Honor^ prefers-reduced-transparency^ and^ prefers-contrast^ everywhere^

## Changed

- apps/web/public/munin.css^
- apps/web/src/styles.css^
- apps/web/public/hud.css

## Next steps

- ^Review^ and^ merge^ PR^ 390^

## What did not work

- none

## 2026-10-15T22:52:00.654Z — MEMORY POST-TASK · munin-foundation

^Recolored^ HUD^ from^ neon^ cyan^ to^ steel/silver^ with^ one^ bronze^ focal^ core^ per^ AJ^ Rune^ brand^ system;^ Huginn/Muninn^ copy^ in^ boot^ and^ core^ label;^ approved^ fjord^ art^ behind^ HUD^ boot;^ replaced^ literal^ rune^ on^ home^ assistant^ button^ with^ M^ monogram^
## Decisions

- ^Follow^ docs/brand/aj-rune-brand-system.md:^ no^ drawn^ ravens^ or^ literal^ runes^
- Bronze^ only^ as^ the^ single^ focal^ accent^

## Changed

- apps/web/hud.html^
- apps/web/public/hud.css^
- apps/web/public/hud.js^
- apps/web/src/assistant-dock.ts

## Next steps

- ^Supply^ owner-approved^ munin-raven-seal^ master^ to^ use^ as^ product^ mark^

## What did not work

- none

## 2026-10-15T23:15:52.159Z — MEMORY POST-TASK · munin-foundation

^Owner-authorized^ vector^ redraw^ of^ the^ raven^ seal^ ^(full^ body,^ 48px+^)^ and^ icon^ ^(head,^ favicon/app^ icon^)^ from^ approved^ concepts;^ registered^ as^ approved^ masters;^ wired^ into^ nav^ bar,^ HUD^ brand^ and^ boot,^ home^ sidebar^ and^ assistant^ button,^ favicons^ on^ all^ pages^ and^ PWA^ manifest^ icons^
## Decisions

- ^Seal^ for^ 48px^ and^ up,^ icon^ below^
- Exact^ ring^ geometry^ and^ mirrored^ markers,^ raven^ traced^ with^ potrace^
- Owner^ authorized^ exception^ to^ the^ no-generated-marks^ rule^

## Changed

- ^assets/brand/masters^
- assets/brand/registry.json^
- apps/web/public/brand^
- apps/web/*.html^ favicon^
- munin-nav.js^
- hud.html^
- App.tsx^
- assistant-dock.ts^

## Next steps

- ^Optional^ designer^ polish^ pass^ on^ claws^ and^ perch^
- Light-background^ variant^ of^ the^ seal^

## What did not work

- none

## 2026-10-15T23:54:26.107Z — MEMORY POST-TASK · munin-foundation

^Free-form^ questions^ now^ answered^ by^ local^ Claude^ Code^ ^(no^ tools,^ no^ session,^ sanitized^ snapshot,^ stdin^ prompt,^ isolated^ cwd^);^ ChatGPT^ bridge^ and^ email^ handoff^ now^ open^ claude.ai;^ settings,^ nav,^ dock^ and^ operator^ chat^ describe^ Claude-first;^ /api/claude/status^ added^
## Decisions

- ^Use^ local^ Claude^ Code^ CLI^ with^ the^ owner^ subscription,^ not^ the^ paid^ API^
- Claude^ answers^ only;^ mutations^ stay^ deterministic^
- ChatGPT^ memory^ import^ kept^

## Changed

- ^src/claude-code-local.ts^
- src/assistant.ts^
- src/api.ts^
- apps/web^ bridge,^ email^ handoff,^ dock,^ settings,^ operator^ chat,^ nav^
- tests^

## Next steps

- ^Restart^ the^ Munin^ API^ on^ the^ PC^ after^ merge^ so^ the^ running^ instance^ loads^ the^ new^ assistant^

## What did not work

- none

## 2026-10-16T20:57:24.646Z — MEMORY POST-TASK · munin-foundation

FreeLLMAPI validated (MIT, no duplication, zero cost with free-tier keys) and documented as optional provider in docs/FREELLMAPI.md; smoke-tested Munin->FreeLLMAPI auth path
## Decisions

- FreeLLMAPI uses existing OpenAI-compatible MUNIN_LLM slot, no code change
- Only free-tier keys from accounts without billing; never activate Premium
- Do not route sensitive-private context via FreeLLMAPI

## Changed

- docs/FREELLMAPI.md
- docs/LLM_SETUP.md

## Next steps

- User installs FreeLLMAPI on Windows with HOST=127.0.0.1 and adds free provider keys
- Consider marking localhost gateways that forward to cloud as external in llmProviderStatus

## What did not work

- llmProviderStatus reports deployment local for localhost proxies that forward to cloud

## 2026-10-20T23:57:59.729Z — MEMORY POST-TASK · munin

REA do Lovable com 8 mecanismos e matriz de adoção; darkly.ai sem evidência verificável (domínio bloqueado, única fonte templated)
## Decisions

- Adotar seletor Planejar/Executar no chat operacional
- Mensagem nova rejeita ação pendente; credencial nunca no chat
- Ações consequentes declaram o que não pode ser desfeito
- darkly.ai: não fabricar REA sem evidência

## Changed

- docs/research/lovable-darkly-rea-2026-10.md

## Next steps

- Implementar Planejar/Executar + sugestões no operator-chat
- Liberar darkly.ai ou receber screenshots para REA

## What did not work

- lovable.dev e darkly.ai bloqueados pela rede do ambiente

## 2026-10-21T00:11:51.482Z — MEMORY POST-TASK · munin

PRs #403 (Planejar/Executar, bloqueio de credenciais, undo, sugestões, fix de prioridades), #404 (J/K/E/Z no Action Inbox), #405 (remoção das cópias obsoletas), #406 (veredito do Sentinel e não-desfazível no cartão de aprovação); suíte completa verde em cada um
## Decisions

- Chat abre em Planejar; API mantém execute como padrão para compatibilidade
- Atalhos de teclado só para ações reversíveis; aprovar/rejeitar ficam em clique+confirm
- ADR-0008 não implementada: aguarda decisão explícita

## Changed

- src/assistant.ts
- src/api.ts
- apps/web/operator-chat.html
- apps/web/action-inbox.html
- src/action-inbox.ts
- apps/web/munin.css (removido)
- apps/web/munin-nav.js (removido)

## Next steps

- Merge dos PRs; resolver conflitos #404x#406 (action-inbox.html) e #400x#401 (munin.css)
- Decidir ADR-0008
- Persistir vereditos de security-reviewer/cost-guardian nas aprovações

## What did not work

- Atalho de prioridades capturava comandos de escrita (corrigido em #403)
- ApprovalQueue usa caminho relativo ao cwd (data/runtime), não MUNIN_DATA_DIR
