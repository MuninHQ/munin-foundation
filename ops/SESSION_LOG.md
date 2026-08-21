# Munin Session Log

> Append concise, durable execution events. This is not a transcript archive.

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
