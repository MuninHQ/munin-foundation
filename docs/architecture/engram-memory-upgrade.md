# Munin Engram-Inspired Memory Upgrade

Status: observation mode

This change adapts selected Engram memory patterns into Munin without introducing Engram as a runtime dependency or creating a parallel canonical memory store.

## Goals

- Keep Munin's existing Control Room state and Second Brain as canonical.
- Add canonical topic keys for evolving memories.
- Add structural dedupe and revision tracking.
- Add progressive retrieval semantics.
- Add lifecycle review metadata and a memory doctor concept.
- Preserve local-first, zero-mandatory-cost operation.
- Avoid destructive migration or automatic promotion of observed memories.

## Observation-mode rules

1. Existing memories remain untouched.
2. New metadata is additive and optional.
3. Topic-key conflicts are reported before any canonical rewrite.
4. Dedupe candidates are surfaced; no existing record is deleted automatically.
5. Review status is advisory until explicitly promoted.
6. Memory doctor is read-only.

## Canonical topic keys

Use two-level lowercase kebab-case keys:

- `architecture/<topic>`
- `decision/<topic>`
- `pattern/<topic>`
- `config/<topic>`
- `career/<topic>`
- `content/<topic>`
- `runtime/<topic>`
- `project/<topic>`

A topic key identifies evolving knowledge and should be reused instead of creating competing canonical memories.

## Dedupe model

Observation-mode dedupe computes a stable fingerprint from:

`project + scope + type + title + normalized content`

Exact duplicates increment observed duplicate metadata in reports. No pre-existing memory is removed.

## Revision model

When multiple observed memories share the same `project + scope + topic_key`, they are treated as revisions of one evolving topic. The report records revision count and latest candidate while preserving prior evidence.

## Progressive retrieval

Recall should be staged:

1. compact candidate search;
2. surrounding timeline/context only for promising candidates;
3. full memory only when needed for the active task.

This reduces context noise while preserving recoverability.

## Lifecycle review

Observed memories may expose:

- `active`
- `needs_review`

`needs_review` is advisory and should be based on configurable review age and memory type. It must not silently invalidate a decision.

## Memory doctor

The read-only doctor should report:

- exact duplicate candidates;
- topic-key collisions or revision chains;
- stale memories needing review;
- orphan project/scope metadata;
- invalid topic-key format;
- unusually large memories;
- conflicting active decisions when detectable;
- retrieval health metrics when available.

## Promotion gate

Observation-mode output must be evaluated before canonical write behavior is enabled. Promotion requires evidence that recall quality improves without increasing false matches, duplicate canonical entries, or context size materially.

## Explicit non-goals

- Do not add Engram Cloud.
- Do not add a Go runtime dependency.
- Do not replace Munin Second Brain storage.
- Do not create a second SQLite memory database.
- Do not weaken approval, audit, privacy, or secret-handling controls.

## Implementation seams added in this branch

- `src/memory-observation.ts`: topic-key normalization/validation, stable fingerprints, lifecycle review and a read-only doctor report.
- `src/memory-progressive-recall.ts`: deterministic staged-recall planning without storage mutation.
- `tests/memory-observation.test.ts`: focused coverage for observation-mode behavior.
- `agents/memory-curator.md`: curator contract updated to keep these capabilities advisory until promotion.

## Observation metrics

Each PRE-TASK recall records a content-free local JSONL metric with candidate counts and character counts only. Raw memory text, prompts, credentials, and retrieved excerpts are not copied into the metrics stream.

Run `npm run second-brain:metrics` to inspect the rolling evidence summary. The report exposes sample count, average candidate/compact counts, estimated compact-context reduction, and the rate at which a full-memory expansion was planned.

These measurements are evidence for the promotion gate. They do not enable canonical dedupe, destructive merging, or automatic deletion. Promotion still requires enough real samples to show lower context noise without unsafe loss of relevant recall.
