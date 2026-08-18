# Munin Session Log

> Append concise, durable execution events. This is not a transcript archive.

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
