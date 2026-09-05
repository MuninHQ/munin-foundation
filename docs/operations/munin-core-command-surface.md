# MUNIN CORE command surface

The Second Brain page at `/context-memory.html` combines current priorities,
actionable next steps, executive checkpoints, runtime status, and existing
governed memory recall. It reads canonical Munin services without creating a
second operational store. Obsidian remains an optional Markdown mirror.

## Sources and behavior

- `/api/action-inbox`: open actions, ordered by priority, with links to existing
  review and execution surfaces. Completed actions are excluded from this panel.
- `/api/second-brain/daily`: the existing `secondBrainDaily` projection and
  executive checkpoint store, exposed through the Context Memory API.
- `/api/orchestrate/status`: canonical Control Room readiness, active engineering
  jobs, human attention, failures, and email worker health.
- Existing recall, timeline, import, and vault controls remain on the same page.

Loading the command panels performs GET requests only. Each source fails
independently and has a 15-second timeout. The refresh label reports partial
updates; unavailable sources replace old content instead of presenting it as
current. Dynamic text is escaped and action links use a fixed local allowlist.
The runtime panel reports aggregate jobs; it does not infer named agents or
Host Worker health from unrelated signals.

## Verification

- `npm test`: 775 tests passed on Windows, including core and web builds.
- Focused browser-logic tests cover action priority, completed-action exclusion,
  unsafe links/text, partial failure, empty refresh, and a stalled source.
- HTTP test verifies the daily projection through the existing memory handler.
- Independent review executed the focused tests and checked canonical schemas.
- Desktop and 390-pixel mobile previews showed the existing navigation, command
  panels, empty states, runtime snapshot, and recall controls without horizontal
  overflow. Preview used isolated local state, not copied private user data.
- One earlier full run timed out in the existing mobile launcher recovery test;
  its isolated rerun and the final full suite passed without changing that test.

## Delivery provenance

Requested intent: `buildall-munin-core-jarvis-20260904-2059`.
The restarted Host Worker consumed it at `2026-09-05T00:07:10Z`. Its production
engineering attempt failed with no valid file changes. A retry against current
`origin/main` also failed after generated code had type errors and the repair
returned no valid changes. Those failures remain recorded as failures.

This implementation was completed separately on an isolated branch based on
`61a2b8e`. The live checkout and its pending Windows runner fixes were preserved.
No automatic merge, deployment, or completed Host Worker receipt is implied by
the implementation tests. Integration must retain this distinction.
