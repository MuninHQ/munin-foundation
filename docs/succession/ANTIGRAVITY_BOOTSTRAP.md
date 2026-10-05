# Antigravity Successor Bootstrap

This is a zero-mandatory-cost operator path. It does not replace Munin's durable state.

## 1. Prepare Windows host

From the Munin repository:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-antigravity-successor.ps1
```

The helper creates local gitignored successor state and checks whether the `agy` CLI is already available. It does not enable billing, install paid APIs, or modify Git history.

If Antigravity is not installed, use Google's current official Windows install instructions rather than a copied third-party installer.

## 2. Open the repository as the project

Antigravity automatically reads the root `AGENTS.md` plus `.agents/rules/*.md`. Workspace skills in `.agents/skills/*/SKILL.md` are discoverable by the agent.

Recommended first commands:

```text
/munin-sitrep
/munin-build-all
```

If the environment does not expose skills as slash commands, ask the agent to use the named skill explicitly.

## 3. Materialize private context locally

Copy:

`docs/succession/PRIVATE_CONTEXT_TEMPLATE.md`

to:

`data/runtime/succession/operator-profile.local.md`

Populate only the local copy. Never commit it.

Also maintain local state files:

- `briefing-state.json`
- `career-radar-state.json`
- `regulatory-radar-state.json`
- `linkedin-review-state.json`

These are operational caches for deduplication/continuity, not a replacement for canonical Munin project state.

## 4. Scheduling

Create the four recurring tasks from `docs/succession/SCHEDULED_TASKS.md`. Keep them staggered so the free quota is not consumed by simultaneous tasks.

Before enabling, verify that Antigravity is using the intended local timezone.

## 5. Model/quota policy

- Use the default/free fast model for routine scheduled research, filtering and summaries.
- Escalate to a stronger free model only for complex architecture, debugging or high-stakes synthesis.
- Let deterministic Munin code perform deduplication, hashing, sorting, state comparisons and formatting where practical.
- Do not consume model context re-reading large static documents when a focused skill/reference is enough.
- On quota exhaustion, preserve state and hand off rather than switching to a paid API automatically.

## 6. Acceptance

The successor path is accepted only after all of these pass on the real host:

1. Antigravity reads `AGENTS.md` and the portable operator rule.
2. `munin-sitrep` returns repository/runtime evidence rather than generic prose.
3. `munin-build-all` can create an isolated branch/worktree, make a harmless test change, run validation and stop before merge.
4. A scheduled test task runs once and writes no private data to Git.
5. Each migrated recurring task can read its local state and deduplicate.
6. No paid API key or billing activation is required.
7. A quota/failure simulation leaves a durable handoff instead of losing task state.

Do not mark the migration complete until host/device acceptance is observed.
