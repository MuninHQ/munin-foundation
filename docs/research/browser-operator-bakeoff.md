# Browser Operator bake-off

Issue: #120

## Current decision

Use **Microsoft Playwright CLI + Agent Skills** as Munin's default local browser action path. Keep **Browser Use** as an optional fallback/experimental backend for tasks where self-recovery and a richer agent harness materially outperform deterministic CLI operation.

## Primary-source evidence

- Microsoft Playwright CLI is explicitly designed for coding agents, advertises lower context/token overhead than MCP, supports installed Skills, persistent named sessions and headed/manual takeover.
- Browser Use provides a persistent CLI plus a richer agent/browser harness with recovery loops. Its open-source local path does not require Browser Use Cloud, although the project recommends its paid cloud for production-scale/stealth/proxy use cases.

Sources:
- https://github.com/microsoft/playwright-cli
- https://github.com/microsoft/playwright
- https://github.com/browser-use/browser-use

## Munin architecture

`Munin intent -> Action Constitution -> Browser Operator -> local browser backend`

The browser backend never owns policy. Every write, form submission, upload, message, purchase or destructive action must be classified by Munin's Action Constitution before execution.

## Benchmark matrix

1. persistent authenticated profile;
2. navigation and read-only extraction;
3. forms and multi-step workflows;
4. upload/download;
5. DOM/page-change recovery;
6. token/context footprint;
7. latency and local RAM/CPU;
8. action log/replay;
9. manual takeover;
10. failure recovery and browser restart.

## Promotion gate

Playwright CLI remains the default unless Browser Use demonstrates materially higher completion/recovery on representative Munin workflows without adding a paid dependency or weakening policy/audit controls.
