# agent-browser bake-off for Munin

Status: adopt as an optional browser backend candidate; do not replace the promoted Playwright CLI path yet.

## Why it is relevant

Vercel Labs agent-browser is a native browser automation CLI designed for AI agents. Its core workflow is `open -> snapshot -> interact by stable refs -> re-snapshot`, and it supports machine-readable `--json` output. It ships a Windows x64 binary and can use an existing Chrome/Chromium installation.

This maps cleanly to Munin's browser capability seam and autonomous `VERIFY` phase. The ref-based accessibility snapshot model is especially useful because the agent can reason over compact structured state rather than screenshots alone.

## Adoption boundary

- Keep Playwright CLI as the current default/promotion winner until a local empirical comparison proves otherwise.
- Treat agent-browser as opt-in and capability-gated.
- Read-only verification commands (`open`, `snapshot`, `get`, screenshot) may be eligible for automatic VERIFY flows.
- Mutating commands (`click`, `fill`, `type`, `upload`, `eval`, downloads, authentication changes) remain behind Munin Action Constitution/permission gates.
- Do not enable paid cloud providers (Browserbase, Browserless, Browser Use, Kernel) by default.
- Do not require Vercel Sandbox or any paid service.

## Local bake-off

Compare agent-browser against the promoted Playwright CLI on the same controlled page and acceptance criteria:

1. executable availability;
2. cold/warm latency;
3. structured snapshot quality and repeatability;
4. process/resource footprint;
5. deterministic read-only verification;
6. Windows setup friction;
7. failure recovery;
8. compatibility with Munin capability permissions.

Promotion requires equal-or-better reliability without weakening permission boundaries. If not promoted, retain it as an optional adapter/fallback candidate.

## Upstream

Source: https://github.com/vercel-labs/agent-browser
License: Apache-2.0.
