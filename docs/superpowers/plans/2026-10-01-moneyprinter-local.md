# Moneyprinter local MVP implementation plan

**Goal:** Produce an offline draft MP4 from a local editorial script on Windows, with durable scene jobs and a prepared Wan2GP MCP handoff.

**Architecture:** Use the existing `media.content-video` runner seam. A Node adapter launches a Python standard-library CLI; SQLite owns scene state, FFmpeg renders and assembles, Windows System.Speech narrates. Wan2GP is optional and receives exported discovery/generation instructions; there is no implicit model download or remote inference.

**Constraints:** No paid API, publication, installation, provider promotion, personal voice, or changes to existing dirty files. Every run has a new directory under the caller's output root. Runtime databases, media and evidence remain outside tracked source. CPU render defaults to 360x640, 24 fps, one worker, two encoder threads. Topic-only requests produce an explicitly unreviewed editorial scaffold, not invented research.

**Files:** `scripts/moneyprinter-local/{pipeline,scene_queue,render,cli,captions}.py`, `scripts/moneyprinter-local/tts.ps1`, `scripts/moneyprinter-local-runner.mjs`, focused Python and TypeScript tests, integration runbook.

## Execution

- [x] Write and execute failing tests for preparation, durable queue claim/retry/cancel, path containment, Wan handoff, renderer failure, and existing capability integration.
- [x] Implement bounded preparation from supplied script, storyboard, English prompt framing with original scene concepts, local asset ledger, subtitle timing and MCP handoff.
- [x] Implement SQLite queue transitions with exclusive worker lock, atomic claim, persisted failures and explicit recovery.
- [x] Implement CPU cards, offline Portuguese narration, verified local clip import, assembly and ffprobe report. Never substitute fake success on error.
- [x] Connect through an opt-in runner; preserve defaults and approval boundaries.
- [x] Execute focused tests, an actual Portuguese short, resume/idempotence checks, full Munin `npm test`, diff review and Second Brain write-back.

## Review focus

- Script punctuation and Unicode must stay data, never shell or filter code.
- Parallel workers must not claim or finalize the same scene twice.
- Missing or corrupt media must fail before assembly and remain recoverable.
- Wan requests must discover actual defaults before submission and remain unsubmitted here.
- Generated evidence must distinguish CPU cards, synthetic narration and untested model generation.

User explicitly requested implementation and end-to-end validation. This plan implements that authorized scope directly; no installation, publication or persistent environment changes are part of it.

## Validation record

2026-10-01: Python 11/11; existing capability integration 2/2; final full Munin suite 862/862 with zero skips/failures; independent quality review passed after corrections. Real pilot: 23.832683 seconds, H264 360x640 and AAC 44100 Hz, five completed jobs, installed Microsoft Maria Desktop narration. Actual local import, partial resume and missing-file invalidation/recovery passed. Preserved 61 existing generated web files by restoring and checking their pre-build hashes. Canonical Second Brain recall/commit completed. No commit, push, publication or global enabling performed.

Review corrections: explicit completed-artifact invalidation, atomic SQLite provenance with import completion, measured caption bounds, atomic JSON replacement. Wan generation remains unexecuted; free VRAM at inspection was only 1187 MiB of 8192 MiB.
