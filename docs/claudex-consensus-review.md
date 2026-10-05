# Optional adversarial review for BUILD ALL

## Audit and design

Baseline: `origin/main` at `199e17c` (2026-10-03). Production BUILD ALL already plans dependency-aware waves, isolates engineering, reconciles serially and verifies the integrated head in a detached worktree with `npm test`. Keep these boundaries.

`reviewOutput` checks output shape/alignment, `consensus-committee` weighs role votes, and `engineering.independent-review` may use a deterministic fallback. None proves two independent model reviews of the actual Git diff. Creative Studio's Claude adapter reviews creative briefs, not repository code. Reuse the production verifier, EvidenceLedger, secret redaction and local runtime directory; add no parallel orchestrator, paid Action or dependencies.

Adapt the [ClauDex reference](https://github.com/hamza-ali-shahjahan/claudex): independent Claude/Codex review, strict SHIP/FIX FIRST/REDESIGN verdicts, up to three rounds, local history and an opt-in gate. Codex is sandboxed read-only; Claude has no tools. Both receive the same bounded, secret-redacted committed diff through stdin. No credentials enter prompts. Subscription authentication is required, never paid API fallback.

## Execution checkpoints

1. Add regression tests for consensus, invalid responses, failures, three-round limit, exact-head/diff binding, gate defaults and stale/tampered evidence.
2. Implement a review service and CLI using the existing EvidenceLedger and secret-redaction helpers. Pin refs to full commit IDs and reject empty/oversized/protected diffs.
3. Integrate opt-in review/receipt checking before production final verification. Gate-off BUILD ALL does not invoke model inference. Enabling the gate authorizes reviews through existing subscriptions; remediation remains with the existing engineering/operator flow.
4. Run focused tests, full `npm test`, design observation and diff/secret checks. Independently review the implementation. Record local auth limitations separately from simulated protocol evidence.

## Safety contract

The local gate is a cooperative workflow control, not a cryptographic authorization boundary against someone who can rewrite local state. Do not claim hashes authenticate model identity. It blocks BUILD ALL completion, not arbitrary Git commits, merges or pushes. It never installs hooks or changes branch protection.

No automatic code edits occur during review. Callers may supply an explicit repair callback to the service, which must return a fresh snapshot after correction; at most three review rounds run. The CLI performs one round per invocation, so fixes remain reviewable and no quota is wasted rereviewing unchanged code. Only two valid SHIP responses with no blocking findings produce consensus. Missing auth/provider failures are recorded as FIX FIRST, never silently substituted by a deterministic reviewer.

## Usage

Build with `npm run build:core`, then:

```text
node dist/src/cli.js cross-review review origin/main HEAD
node dist/src/cli.js cross-review check origin/main HEAD
node dist/src/cli.js cross-review stats
node dist/src/cli.js cross-review gate status
node dist/src/cli.js cross-review gate on
node dist/src/cli.js build-all "<objective>"
node dist/src/cli.js cross-review gate off
```

Reviews cover committed changes, not the index/untracked files. On `FIX FIRST`, correct and commit through the existing engineering flow, then review the new head. The service supports bounded corrective callbacks, but the CLI and verifier never let a reviewer modify code. `REDESIGN`, unavailable models, malformed responses and exhausted rounds never yield consensus.

With the gate enabled, the production verifier reuses an exact successful receipt or runs one independent review round for its integrated head. It blocks completion on any non-consensus outcome. It does not infer against a corrupted ledger/configuration. The existing independent `npm test` remains required even after SHIP. Gate configuration and the hash-chained local review ledger live under ignored `data/runtime/`; no hooks, external permissions, API keys, installations or GitHub workflows are added. This local setting is scoped to the checkout where enabled and is not automatically copied into worker sandboxes or other clones.

Auth checks: `codex login status` must report ChatGPT; `claude auth status` must report authenticated first-party OAuth. Credentials stay in existing CLI stores. Child environments remove API/provider overrides; Codex ignores user configuration and uses `--sandbox read-only` with approval `never`; Claude uses bare mode with tools disabled and no project settings. Both run in empty temporary directories with the redacted diff on stdin. A first-model failure skips the second invocation to preserve quota. Existing subscription quota still applies; this is zero additional API billing, not unlimited inference.

On Windows, the Claude adapter currently supports the npm installation's native executable at `%APPDATA%/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe`. Other installation layouts fail closed and need a future explicitly supported resolver; no shell shim is executed. Linux/macOS resolve `claude` from PATH. Protected paths, private keys and any remaining detected sensitive content are rejected before inference; pattern-based screening is not a proof that arbitrary private data is absent.

The existing independent-review capability and weighted committee retain their current semantics. Their deterministic/external notes cannot substitute for the new two-model receipt. No ClauDex plugin, Action, new orchestration runtime or package dependency is installed.

The audit also reproduced Windows `execFile('npm.cmd')` failing with `EINVAL` in production engineering/final verification. Both now reuse the existing `resolveNativeInvocation` from `execution-sandbox` to launch npm through Node without a command shell. A host-executed regression test checks the actual installed npm binary.
