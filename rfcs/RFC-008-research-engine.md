# RFC-008 — Research Engine

## Status

Accepted for implementation.

## Objective

Turn research into structured, attributable and reusable context instead of isolated notes.

## Model

A research record contains:

- a question;
- optional project ownership;
- evidence with title, URL, source class and capture time;
- immutable synthesis versions referencing evidence IDs;
- lifecycle status and timestamps.

## Commands

```text
munin research add <project-id|-> <question>
munin research list
munin research evidence <research-id> <primary|secondary> <url> <title>
munin research synthesize <research-id> <summary>
munin research report <research-id>
```

## Trust controls

- Evidence URLs must be syntactically valid.
- Evidence is never silently replaced.
- Each synthesis creates a new version.
- Explicit evidence references must exist in the same research record.
- Project-linked research is represented in the context graph.
- Every mutation emits an append-only event.

## Compatibility

Existing state files without a `research` collection load with an empty collection.

## Out of scope

- Web crawling.
- Automated truth scoring.
- Citation-format generation.
- Full-text indexing or vector search.
- Autonomous publication.

## Acceptance criteria

1. Research can be created with or without a project.
2. Evidence can be captured with provenance metadata.
3. Syntheses are versioned and evidence-aware.
4. Research can support a project through the context graph.
5. Invalid URLs and missing evidence references are rejected.
6. Tests and documentation pass in CI.
