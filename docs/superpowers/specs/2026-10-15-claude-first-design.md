# Claude-first: Claude as Munin's focal reasoning layer

Status: approved by the owner on 2026-10-15. Replaces the ChatGPT-first default.

## Goal

Make Claude the place where Munin reasons. Munin answers free-form questions in its own surfaces, and long conversations continue in claude.ai. This needs no paid API: it uses the owner's Claude subscription through the locally installed Claude Code CLI.

## Decisions

1. **Local answers through Claude Code.** `src/claude-code-local.ts` runs `claude -p` headless, and is used only after every deterministic command has failed to match.
   - The call passes `--tools ""`: Claude cannot read files, run commands or change data.
   - The call passes `--no-session-persistence`, `--strict-mcp-config` and `--setting-sources ""`, and runs in an empty temp directory: each question is isolated, and no plugins, hooks, MCP servers or project `CLAUDE.md` load.
   - The question goes in on stdin and the Munin system prompt replaces Claude Code's, so no user text reaches the command line.
   - No `--model` is passed: the owner's Claude Code default model applies.
   - Claude receives a sanitized snapshot (daily brief, counts, top projects, actions and jobs; no tokens, e-mail bodies or credentials) plus the question.
   - The call has a 90-second timeout and a 16 KB output cap. When the CLI is missing, fails or times out, Munin falls back to the existing local message.
   - Turning `MUNIN_CLAUDE_CODE=off` disables the path; `MUNIN_CLAUDE_CODE_BIN` overrides the executable. Under `node --test` it is off unless `MUNIN_CLAUDE_CODE=on`.
2. **Mutations stay deterministic.** Creating actions, projects, jobs and research, and changing job stages, keep going through the existing local parsers. Claude only answers; results are marked `interpretedBy: 'claude'`.
3. **Status endpoint.** `GET /api/claude/status` reports whether the CLI is available and its version.
4. **Handoff to claude.ai.** The ChatGPT operator bridge becomes the Claude operator bridge. It keeps the sanitized, manual, zero-risk packet: it copies to the clipboard and opens `https://claude.ai/new`, with `?q=` prefilled when the encoded prompt is short enough. The e-mail handoff does the same.
5. **Copy.** Settings, navigation and the assistant dock describe Claude-first as the default mode.

## Out of scope

- ChatGPT history import into memory (`chatgpt-export`, memory promotion): this is the owner's data and stays.
- The optional OpenAI-compatible and Anthropic API providers, and image generation.

## Testing

- Unit tests inject a fake runner: no tools are enabled, the context is sanitized, and every failure falls back.
- The existing UI contract tests move from ChatGPT-first to Claude-first.
- An end-to-end check on the owner's PC asks a real question through `/api/assistant`.
