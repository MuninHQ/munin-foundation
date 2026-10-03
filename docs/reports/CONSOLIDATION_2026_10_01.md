# SITREP — Munin consolidation, 2026-10-01

## Outcome and boundary

Recoverable Token Efficiency v2 and Automaton changes are reconciled with remote main in `consolidation/2026-10-01`. This is a review branch, not a deployment or a main merge. The reported Connector Permission Delta Gate and separate Skill Promotion Gate could not be recovered from the accessible repositories. Their earlier conversation descriptions and test counts are not current verification evidence.

Repository: `MuninHQ/munin-foundation`. Source checkout: `D:/Dev/munin-foundation-git`. Isolated integration checkout: `D:/Dev/munin-consolidation-20261001`.

## Commit provenance

- Remote baseline: `f09b4fafa3d68f2c4b1ae1307f94dbf54db21d59` (PR #374, Token Efficiency v1).
- Original local main: `c59fd70`; 15 commits absent from remote main.
- Integration merge: `5e8cd14`, with remote main and local main as parents; automatic merge had no textual conflicts.
- Token Efficiency v2: `470e28b`, `3db750f`, `2c74acb`, `a4cc4e8`, `fbb313f`, `71af497`, `a5e8973`, `ecdf62d`, `26d8c0e`, `e784831`, `c415a97`, `73fbcfb`.
- Process ownership repair: `9d4580f`.
- Automaton bridge and router: `4ba8ca7`, `c59fd70`.
- `feat/automaton-local-bridge` has duplicate commits `b1aeb40` and `36608f9`. Their stable patch IDs match the selected bridge/router commits; the final trees are identical. No duplicate replay was performed.
- Safety repair: `07b3afa`. Documentation commits are listed in the PR history.
- Provenance/test documentation: `9ddc286`. Published branch: `consolidation/2026-10-01`. Draft PR: [#375](https://github.com/MuninHQ/munin-foundation/pull/375).

## Reconciliation and safety

The merge retained remote v1 observer/config/report modules, existing Promotion Gate observation hooks and documentation. v2 adds bounded context selection, lazy capability selection, compact Build State, output reduction, separate efficiency diagnostics and manual-only web handoff. Economic and Token Governor recommendations remain `applied:false`; v1 remains disabled by default. No provider enforcement or automatic skill promotion was enabled.

Independent review reproduced and corrected Registry bypass, late SLA success, unconfirmed cancellation, accepted task identity loss after wake failure, and IPv6 loopback rejection. Regression tests failed before the corrections and passed afterward.

Automatic Automaton activation via `MUNIN_AUTOMATON_AUTO_ROUTE` is quarantined. A prompt and intent regex are not an enforced read-only executor boundary. Controlled programmatic evaluation requires an explicitly registered enabled/offline/zero-cost profile supporting the capability; default runtime profiles do not register Automaton. Submission/status are deadline-bounded, and unknown submission identity or uncertain cancellation blocks fallback. Manual submission keeps its existing dual opt-in but does not establish read-only isolation.

No local service was started, no startup task or automation was installed, no environment activation flag was changed persistently, and no skill was promoted. Original uncommitted Offer Architect work was preserved; generated web output was excluded from integration commits.

## Local reference inventory

Ahead counts below are graph counts against the fetched baseline, not proof of missing functionality; squash merges can leave old commit IDs outside main.

- `main` and `feat/automaton-local-bridge`: 15 each; consolidated once as described above.
- `buildall/repair-career-confidence-windows-sandbox`: 1; patch-equivalent in main, PR #333 merged.
- `fix/research-wave1-youtube-buffer`: 1; patch-equivalent in main.
- `feat/local-council-ollama`: 13; PR #100 merged, not replayed.
- `claude/munin-architecture-ux-audit`: 8; PR #74 merged, not replayed.
- `agent/career-intake-regression-gate`: 23; PR #226 closed; retained for separate scope review rather than reviving abandoned history.
- `chore/phase-1-ai-productivity-stack`: 21 and `feat/phase-2-ai-engineering-os`: 33; PRs #10/#11 closed; retained, not replayed.
- `buildall/yt-lab-agenttube`: 7; YT Lab/AgentTube and earlier prompt intelligence work, preserved for a separate integration decision.
- `ops/real-use-preparation-20260923`: 1 documentation-only commit `6f1dd37`; preserved as historical evidence, not promoted to current operational claims.
- `spike/local-decision-engine-observe-20260923`: 1 commit `8127a42`; experimental worker/model dependency path, retained outside this consolidation.
- `backup/pre-bootstrap-20260822` and `backup/pre-buildall-local-main`: 2 each; archival references retained.
- Other local foundation branches in the source repository have no commits ahead of the baseline.
- Agent Runtime/Approval UX work in `C:/Users/night/munin-agent-runtime-buildall` is already merged through PRs #365–#368.
- Older project-mirror foundation/adaptive/Second Brain checkouts were inspected for missing gates; no gate artifact or `da54dde` was recovered there.

## Missing gates

`radar/2026-10-01-connector-permission-delta` was absent from accessible branch inventories. `git cat-file` could not resolve `da54dde` in the inspected foundation repositories; GitHub commit lookup returned HTTP 422, no commit found. Targeted filename/content searches found no recoverable Connector Permission Delta implementation or standalone Skill Promotion Gate with the reported quarantine/hash/replay pipeline. Existing capability/document promotion and observation code remains intact; it does not establish the missing implementation.

The user did not know another storage location. These gates require the original checkout, patch, export or other verifiable artifact before reconciliation. They were not fabricated or replaced with a newly invented implementation. Connector permission escalation remains a human approval boundary; this consolidation does not resolve any external Manus permission request.

## Validation

- Locked install: `npm ci --no-audit --no-fund`, successful.
- Remote baseline: `npm test`, TypeScript + Vite build and 875/875 tests.
- Integrated pre-repair suite: 903/903 on a full rerun.
- Final corrected Munin: `npm test`, TypeScript + Vite build and 910/910 tests, no failures/skips.
- Independent reviewer: 23/23 focused regressions; verdict pass with observations.
- Agent control-plane/design observer tests: 8/8. Control-plane profiles have no findings. Design checker remains observe-only: 85 files, 1,430 findings, no automatic restyling.
- Two earlier broad runs exposed intermittent pre-existing mobile server/heartbeat timing failures; focused/rerun evidence passed. Final broad Munin run was performed without concurrent Automaton load.
- Automaton at `C:/Users/night/automaton-munin-integration`, commit `48f4889`: 1,657/1,657 tests across 64 files and full `pnpm build` (runtime and CLI) under the existing Node 22.22.1 host runtime. The first run under terminal Node 24.18.0 failed because SQLite was compiled for Node ABI 127 instead of 137; no native module was rebuilt or runtime restarted.
- Changed Markdown: 11 files checked, zero issues. Full repository lint with markdownlint-cli2 0.23.3 reports 1,350 issues in 68 files (including the newly introduced upstream MD060 rule); none of the matched error file paths is changed by this consolidation. This existing repository-wide lint debt is not silently waived or mass-reformatted.
- Final source diff whitespace check passes; generated `dist-web` build output was restored/removed only in the isolated integration checkout.
- Bounded added-line credential/private-key pattern scan: zero matches. Remote main was re-fetched before publication and remained `f09b4fa`.
- The GitHub Markdown check passed on the first published revision; other CI jobs were still running at publication. This uses the repository workflow's tool version, while the separate latest local lint result above remains recorded accurately.
- Canonical Second Brain post-task commit completed in the original source checkout; raw private context was not published. Original uncommitted work remains outside this integration branch.

Logs are local artifacts under `D:/Dev/munin-consolidation-*.log`; private Second Brain context is excluded from publication.

## Residual risks and next actions

Recover missing gate sources; review the draft PR and remote CI before any merge; separately reconcile Offer Architect and explicitly selected older feature branches. Manual Automaton submission lacks enforced read-only isolation and needs deliberate operator review. Runtime/GPU/Ollama smoke was not executed in this consolidation, and historical 1,657-test/GPU claims are not substituted for current evidence. Savings telemetry is an estimated context proxy; zero candidate/selected-file counts at the orchestration boundary do not prove actual monetary savings.

Original branches and source-checkout dirty work remain preserved. This PR supplies one canonical integration line for the recovered scope; it does not claim that every historical branch or missing feature is integrated.
