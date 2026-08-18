# Munin v0.1 Implementation Plan

> Consolidated implementation map as of 2026-08-18. This document describes the current system rather than the original first vertical slice.

## System loop

```text
objective
  ↓
Control Room state hydration
  ↓
Munin multi-agent supervisor
  ↓
specialist/runtime execution
  ↓
test + independent verification
  ↓
FIX/retry when recoverable
  ↓
durable state / Memory Ledger write-back
  ↓
operator handoff
```

A later invocation begins from durable state again; it must not require the previous process memory.

## Current implementation map

| Capability | Primary implementation | Status |
|---|---|---|
| Canonical state hydration/write-back | `src/control-room-state.ts` | implemented |
| Canonical objective runtime | `src/control-room-orchestrator.ts` | implemented |
| Multi-agent supervisor | `src/agent-orchestrator.ts` | implemented |
| Production specialist adapters | `src/agent-runtime-adapters.ts` | implemented |
| Autonomous engineering loop | `src/autonomous-execution-loop.ts`, `src/engineering-autonomous-mission.ts` | implemented |
| Provider-neutral capability seam | `src/runtime-capability-seam.ts` | implemented |
| Browser verification | `src/browser-operator.ts`, `src/engineering-browser-verifier.ts` | implemented |
| Recovery / leases / fencing / outbox | `src/recovery.ts`, `src/persistent-leases.ts`, `src/side-effects.ts`, `src/outbox.ts` | implemented |
| Structured continuity memory | `src/continuity-memory.ts`, `src/project-memory.ts` | implemented |
| Append-only Memory Ledger | `src/memory-ledger.ts` | implemented |
| Historical ChatGPT promotion | `src/chatgpt-export.ts`, `src/chatgpt-memory-promotion.ts` | implemented |
| Career mobile intake | `src/career-intake.ts`, `src/career-mobile-api.ts`, `src/career-vision-extractor.ts` | implemented |
| Trusted-source content radar | `src/trusted-source-radar.ts` | implemented |
| Mobile API | `src/mobile-api.ts` and domain mobile APIs | implemented |
| Local provider fallback | `src/ollama-provider.ts` | implemented |

## Entry points

Core development gate:

```bash
npm install
npm run build:core
npm run build:web
npm test
```

Canonical objective execution:

```text
munin orchestrate <objective>
POST /api/orchestrate
```

Governed historical memory promotion:

```text
memory import-chatgpt-project <conversations.json>
```

Career mobile intake:

```text
POST /api/mobile/career/intake
GET /api/mobile/career/capabilities
```

## Delivery rule

A repository-side increment is mergeable only when:

1. it preserves accepted safety/provider boundaries;
2. no unresolved true-human blocker is hidden as a technical success;
3. core build passes;
4. web build passes when the shared repository is affected;
5. automated tests pass;
6. Markdown/docs checks pass when applicable;
7. evidence is written into the PR/commit history;
8. canonical backlog/state is updated when the increment materially changes execution truth.

## Remaining implementation sequence

1. Expand end-to-end acceptance from product continuity to engineering verification/recovery and durable write-back.
2. Consolidate operator-facing observability/SITREP across orchestration, engineering jobs, browser verification, memory and connectors.
3. Finish the Career native/share-sheet UX against the stable API contract without colliding with the Lovable frontend stream.
4. Complete external-connector security/privacy review and permission inventory.
5. Consolidate remote-access/local-host operating runbooks.
6. Map useful AIP artifacts into this architecture and archive obsolete duplicates rather than creating parallel foundations.
7. Continue targeted open-source ecosystem evaluation only where it measurably improves an existing capability seam.

## Human evidence boundary

Repository automation can prove deterministic behavior, but it cannot fabricate real-device, real-user or local-hardware observations. The following remain evidence-gated rather than code-gated:

- empirical Career Continuity success rate;
- real iOS Share Sheet behavior on the target device;
- local document/media model performance on the Munin host;
- credentials, 2FA and external account authorization;
- public publication or other consequential external actions.
