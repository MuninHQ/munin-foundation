# ChatGPT historical memory promotion

Munin may ingest a ChatGPT `conversations.json` export, but historical conversation content is not automatically treated as durable project truth.

## Two-stage model

1. `parseChatGptExport()` converts user-authored export messages into typed continuity-memory candidates with source provenance and timestamps.
2. `promoteChatGptProjectMemory()` reviews those candidates for explicit Munin/project relevance before writing them into continuity memory and the append-only Memory Ledger.

The safe CLI entrypoint is:

```text
memory import-chatgpt-project <conversations.json>
```

The older `import-chatgpt` command remains available as a generic continuity-memory importer, but it does not represent project promotion.

## Relevance policy

A record is promoted to Munin project memory only when at least one explicit project signal exists, such as:

- the `munin` tag produced by the export parser;
- references to Munin, MuninHQ, `munin-foundation`, Control Room, the orchestrator, autonomous execution, Memory Ledger, Career Mobile Intake/Inbox/Intelligence, Lovable work on Munin, AIP, or Andre Intelligence Platform.

Unrelated identity/preferences are rejected unless the record also contains explicit project context. Generic career, family, gaming, health, finance, lifestyle, or other personal conversation content is not promoted merely because it exists in the export.

## Provenance and storage

Promoted records preserve their original `chatgpt-export:<conversation-id>` source, observed timestamp, confidence, tags, subject, and content. The Memory Ledger additionally records `provenance: chatgpt-export-reviewed` and `projectId: munin`.

The import report exposes reviewed, accepted and rejected counts plus the decision/reason for every candidate. Memory Ledger deduplication prevents identical promoted entries from being appended repeatedly.

## Boundaries

- The source export remains user-controlled; Munin does not upload it to GitHub.
- Runtime memory is private local state and is not committed by this feature.
- Promotion is relevance-based, not a claim that every historical statement is still current. Existing continuity freshness/correction semantics remain authoritative.
- Public publication, credential changes, financial actions, or other consequential external actions are never authorized by imported conversation content alone.
