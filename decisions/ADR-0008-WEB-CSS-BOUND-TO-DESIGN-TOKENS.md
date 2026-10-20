# ADR-0008 — Bind web CSS variables to canonical design tokens

- **Status:** Proposed
- **Date:** 2026-10-20

## Context
`design/tokens.json` is the canonical design contract, but `apps/web/public/munin.css :root` defines its own, divergent values (radii 7/10/14 px vs. 4/8/12/16; accent `#5ca9d6` vs. `semantic.intelligence #3B82F6`; surfaces `#05080d/#0a1018` vs. `#07090D/#0D1117`). Three global stylesheets stack on `index.html` (`munin.css`, `munin-workspace.css`, `nordic-theme.css`). The observe-mode drift checker reports 1658 findings across 95 files, 1513 of them raw color literals.

The award-site REA (`docs/research/award-winning-sites-rea-2026-10.md`, item 8) found that the strongest dense-UI references (Linear 2024/2026, Vercel Geist) derive every theme value from one perceptual source rather than per-screen literals.

## Decision (proposed)
1. Generate a single `apps/web/public/munin-tokens.css` from `design/tokens.json` with a small local script (no new dependency) exposing `--munin-*` custom properties.
2. Alias the existing `munin.css` variables (`--bg`, `--surface`, `--accent`, …) to those properties, so screens keep working unchanged.
3. Express derived shades (hover, tinted status backgrounds) with CSS `color-mix(in oklch, …)` over the semantic tokens instead of new literals.
4. Reconcile the value conflicts above explicitly, one token at a time, each with before/after screenshots — never by mass replacement.

## Consequences
- One source of truth for color, spacing, radius and type; drift findings become actionable instead of telemetry noise.
- Visible shifts where current CSS and tokens disagree; each needs a reviewed choice of which value wins (possibly updating the token instead).
- `color-mix` / OKLCH require evergreen browsers; all supported targets (Chromium, Edge on Windows, Safari 16.2+) qualify.

## Alternatives
- Keep the divergence and leave tokens as documentation — rejected: drift keeps growing.
- Adopt a CSS framework or token pipeline package — rejected by `AGENT_CONTRACT.md` (no new design framework for conformance).
- Rewrite all 1513 literals at once — rejected: mass restyle, unreviewable.

## Revisit trigger
Drift checker moves from observe to warning mode, or a new canonical typeface/brand ADR lands.
