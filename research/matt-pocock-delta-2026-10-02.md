# Matt Pocock repository delta — 2026-10-02

Mode: **observe/adapt**, not bulk install.

Reviewed patterns:
- `mattpocock/skills` pinned at `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`; MIT license verified. Useful patterns: compact shared vocabulary, spec/ticket/implementation discipline, TDD, review, retro and writing-for-agents.
- `mattpocock/course-video-manager` observed at `e882f0a471d105dc8f32f6b14eea077e75f140b7`. No root license was found during review, so Munin must not copy its implementation. Architectural observations only: cached transcripts, timed captions, isolated overlays, FFmpeg composition, optional Remotion rendering, thumbnails and staged publishing.
- Sandcastle/Evalite/agent-browser were not adopted as new mandatory frameworks because Munin already has sandbox, evaluation and browser seams. Duplicate orchestration would raise complexity without a demonstrated benchmark win.

Native adaptations created by this delta:
1. `GLOSSARY.md` for a compact shared domain language and context diet.
2. `Context Profiler` for component-level context/token estimates without returning raw prompt content.
3. `money-printer-local-v1` render manifest for a zero-mandatory-cost local content-video pipeline.

Promotion boundary:
- no third-party skill was installed or executed;
- no external repository became a runtime dependency;
- Skill Promotion Gate remains authoritative;
- renderer/transcription executables remain explicit host opt-ins;
- Playwright remains the promoted browser backend.
