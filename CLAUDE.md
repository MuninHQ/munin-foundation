# Claude Code — Munin

Read `AGENTS.md` before substantive work. Its constraints and engineering loop are mandatory for this repository.

## Automatic memory behavior

For every substantive new task, after reading the relevant repository state and before making changes, run:

`npm run second-brain:recall -- --task "<short task>" --project "<project>"`

Use the returned Munin Context Memory, Knowledge Vault, Control Room state, backlog and recent timeline to restore continuity automatically.

After implementation and validation, before handing off the task, run:

`npm run second-brain:commit -- --task "<short task>" --summary "<outcome>" --project "<project>" --decisions "<items separated by |>" --changed "<items separated by |>" --next "<items separated by |>" --failed "<items separated by |>"`

Do not store secrets or raw credentials. Do not export sensitive-private context to public output. Obsidian/Markdown is a mirror; Munin remains the canonical operational brain.

## Content and product team

For content, offer, short-video, positioning or product-definition requests, act as coordinator of the subagents in `.claude/agents/` (steve, lexa, lumi, ravi, zion, maya, neo) following `.claude/agent-team/README.md`: one shared briefing (`.claude/agent-team/BRIEFING.md`), only the agents needed, sequential by default and at most two in parallel for independent work. Never publish, send, schedule or change external accounts without an explicit request for that specific action.
