# Munin Agent Documentation

This directory contains recovery and handoff guidance for replaceable AI operators. It exists to prevent Munin from depending on any agent's private conversation history.

## Read first

All agents must begin with the repository's canonical sources:

1. `/README.md`
2. `/AGENTS.md`
3. `/ops/CURRENT_STATE.md`
4. relevant product/architecture docs and ADRs
5. `AGENT_HANDOFF_PROTOCOL.md`

## Agent-specific recovery

- `MANUS_ONBOARDING.md` — bootstrap/recovery instructions for a fresh Manus session after history loss.

Future agent-specific files should be added only when they contain genuinely provider-specific setup or recovery guidance. Shared rules belong in `AGENTS.md` or `AGENT_HANDOFF_PROTOCOL.md` so knowledge does not fragment.
