# Manus Recovery Onboarding

> Purpose: allow a fresh Manus session to resume Munin work after loss of conversation history without depending on any agent's memory.

## 1. Repository and local workspace

- Canonical repository: `MuninHQ/munin-foundation`
- Canonical Windows local workspace: `D:\Dev\munin-foundation-git`
- Default branch: `main`
- Git/repository state is authoritative for code, architecture and durable project knowledge.
- Conversation history in Manus, ChatGPT, Claude or any other agent is **not** a system of record.

Before editing anything, confirm that you are in the canonical workspace and inspect Git status. Never overwrite local uncommitted work.

## 2. Required reading order

Read these before proposing or executing changes:

1. `README.md`
2. `AGENTS.md`
3. `ops/CURRENT_STATE.md`
4. `ops/BACKLOG.md` if present
5. `ops/SESSION_LOG.md` if present
6. `docs/product/munin-v0.1-spec.md`
7. `docs/product/munin-v0.1-build.md`
8. `docs/architecture/` relevant to the task
9. `decisions/` relevant ADRs
10. `docs/agents/AGENT_HANDOFF_PROTOCOL.md`

Then inspect the implementation and tests related to the requested work.

## 3. Mission

Munin is a persistent contextual operating environment around human goals, evidence and continuity. Improve it without creating mandatory paid inference, vendor lock-in, unsafe invisible automation or parallel sources of truth.

The current operating model is ChatGPT-first for interactive intelligence while Munin remains the durable execution/state layer. Local AI and external providers are optional adapters, not mandatory startup dependencies.

## 4. Non-negotiable constraints

- Zero mandatory additional cost for core operation.
- Do not activate, purchase or consume paid APIs/credits without explicit human approval.
- Never commit secrets, tokens, OAuth credentials, private runtime data or screenshots containing private data.
- Preserve Windows as a first-class host.
- Preserve existing safety/approval/audit boundaries.
- Reuse existing abstractions before introducing frameworks or duplicate services.
- Do not delete or rewrite working functionality merely to simplify implementation.
- Do not claim a host/device/runtime test was performed unless it actually was.
- Safe reversible engineering work should continue until completion or a genuine human/external boundary.

## 5. What was already achieved before Manus history loss

The repository already contains the durable implementation truth. Important milestones from the previous collaboration include:

- Control Room orchestration and bounded autonomous engineering loop.
- Durable state/session continuity and Memory Ledger.
- ChatGPT-first Operator Bridge with sanitized handoff and no mandatory OpenAI API billing.
- Gmail/Outlook read-only connector architecture and email/operator SITREP flows.
- Windows OAuth/token hardening and remote callback/Tailscale work.
- Career Intelligence, Career Inbox and mobile/iOS vacancy intake foundations.
- LinkedIn Content Intelligence, Brand Preflight/Publisher governance and manual-publication boundary.
- Unified mobile navigation, Action Inbox, Radar and operator surfaces.
- Host Worker and supervised `deploy-main` path.
- Manus Operational Bridge for bounded allowlisted research/analysis/draft/diagnostic tasks with budget controls.
- Unified operator commands including start/build/verify/ship/doctor/mobile-test.
- Repository test suite had previously reached a fully green state during stabilization; always rerun the current suite rather than assuming the historical count remains current.

Treat `ops/CURRENT_STATE.md`, tests and current code as more authoritative than this summary if they differ.

## 6. Previous Manus role

Manus is an optional engineering/research operator. It must augment Munin rather than become a required inference engine.

Good Manus tasks:

- repository analysis;
- bounded implementation;
- diagnostics;
- research with evidence;
- drafting implementation proposals;
- test/verification assistance;
- documentation and handoff maintenance.

Do not create an arbitrary remote-shell control plane or bypass approval gates.

## 7. Resume procedure

On a fresh Manus session:

1. Confirm access to `D:\Dev\munin-foundation-git`.
2. Run/inspect `git status`, current branch and latest commit.
3. Read the required documents above.
4. Inspect current tests and package scripts before choosing commands.
5. Summarize: current state, latest completed work, remaining human boundaries, and the next safest executable tasks.
6. Do not code until this reconstruction is complete.
7. Once reconstructed, execute the highest-priority safe/reversible task and continue through build/test/verify/fix.
8. Update durable documentation before declaring the task complete.

## 8. Definition of done

A task is complete only when:

- implementation is coherent;
- relevant tests were added/updated;
- required build/tests pass;
- behavior was verified to the extent possible in the actual environment;
- documentation/current state is updated when materially changed;
- changed files, test results and blockers are reported;
- no mandatory paid dependency or secret leakage was introduced.

## 9. First response expected from a newly connected Manus

Do **not** immediately refactor or install dependencies. First return a recovery SITREP containing:

- repository path and branch confirmed;
- whether the worktree is clean;
- latest commit observed;
- architecture/current phase understood;
- relevant existing capabilities discovered;
- remaining human-boundary acceptance items;
- proposed next 3 safe tasks, ordered by value and dependency.

After that SITREP, continue autonomously on safe reversible work unless a genuine human boundary is reached.
