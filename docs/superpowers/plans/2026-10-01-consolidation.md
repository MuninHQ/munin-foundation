# Munin consolidation implementation plan

**Goal:** Reconcile recoverable local work with remote main without enabling execution or promoting skills.

**Baseline:** Remote main f09b4fa; local main c59fd70; original checkout has unrelated Offer Architect work and generated web output. Integration owner: current agent. Independent quality reviewer: integration_review, read-only.

## Constraints

- Keep observation/shadow advisory and Provider Registry authoritative.
- No automatic skill promotion, runtime startup, paid inference, or main merge.
- Preserve original branches and uncommitted work; use D:/Dev/munin-consolidation-20261001.
- Missing artifacts are evidence gaps, never recreated as purported recovered commits.

## Checkpoints

- [x] Fetch origin; recall Second Brain; capture original status and remote baseline.
- [x] Install locked dependencies; validate baseline build and 875 tests.
- [x] Merge local main onto remote main in consolidation branch, retaining both efficiency versions.
- [x] Compare duplicate Automaton patches; do not replay identical commits.
- [x] Inventory other local branches and locate missing gate artifacts.
- [x] Reproduce review findings in tests/automaton-readonly-router.test.ts and tests/orchestration-runtime.test.ts.
- [x] Repair Provider Registry admission, SLA bounds and verified cancellation in src/automaton-readonly-router.ts and src/orchestration-runtime-core.ts.
- [x] Preserve accepted task identity when wake fails in src/automaton-local-capability.ts; test with loopback mock.
- [x] Validate focused regressions, complete npm test, observer scripts, Markdown and secret/diff checks.
- [x] Obtain independent follow-up review and document exact residual limitations.
- [x] Publish consolidation branch and draft PR; commit Second Brain outcome; report evidence and remaining gaps.

## Review focus

No eligible registered provider must mean no executor calls. Slow transports must not produce successful results past SLA. Unconfirmed cancellation must block fallback. A failed wake must retain the queued task ID for cancellation. Diagnostics cannot change execution results or promote skills.
