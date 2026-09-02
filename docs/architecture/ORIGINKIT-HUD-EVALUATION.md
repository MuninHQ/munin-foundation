# OriginKit HUD Evaluation

**Status:** proposed visual backlog; this document does not ship an implementation.

## Decision

**ADAPT / EXPERIMENT** — use OriginKit as a visual-pattern and component-source library for the Munin HUD, not as a mandatory runtime dependency.

## Why

OriginKit provides animated web components including Kinetic Grid, SVG Particles, Black Hole, Particle Tunnel, text effects and animated backgrounds. These patterns align with the Munin HUD objective of feeling like a living command surface rather than a static dashboard.

The current HUD is plain HTML/CSS/JavaScript with existing canvas layers (`hud-sphere-bg`, `hud-fx`, `hud-iris`, `hud-wave`) and therefore should not be migrated to React/Next.js merely to consume OriginKit components.

## Architecture gate

- Do not migrate the dedicated HUD to React/Next.js or add new UI dependencies solely for OriginKit.
- Do not make the OriginKit MCP or API key a Munin startup dependency.
- Never commit an OriginKit API key.
- Prefer adapting visual algorithms/patterns to the existing HUD stack.
- Effects must degrade gracefully when animation is disabled or hardware is constrained.
- Respect `prefers-reduced-motion`.
- Ambient effects must remain optional through the existing HUD ambient toggle.
- Core commands, panels and accessibility must work with effects disabled.
- Mobile performance is a release gate.

## First candidates

### ADAPT

1. **Kinetic Grid** — evolve the existing HUD grid into a depth-reactive ambient layer.
2. **SVG Particles / Particle Tunnel** — enrich the core without obscuring operational information.
3. **Scramble Text / Text Morph** — restrained state-transition effects for system status and core labels.
4. **Black Hole** — inspiration for the Munin Core focal visualization, not a literal dependency.

### WATCH

- Image galleries and carousels: little value for the command HUD today.
- Decorative button effects: avoid unless they communicate system state.
- High-density full-screen effects: use only after FPS/mobile verification.

## Integration strategy

Phase 1 requires no API key: improve the native HUD using OriginKit-inspired interaction principles while preserving existing canvas architecture.

Phase 2 may fetch selected source components using OriginKit's free API key only if their implementation provides measurable value that is expensive to reproduce safely. Any fetched source must be reviewed and adapted into Munin conventions.

## Release criteria

- no new mandatory package/runtime dependency;
- no secrets in repository;
- HUD remains functional with JavaScript visual effects disabled;
- ambient toggle controls non-essential motion;
- reduced-motion users receive a stable interface;
- desktop and mobile layout remain usable;
- visual changes do not interfere with command execution or data readability.

## Source

OriginKit public plugin repository (`vellum-ai/originkit`). Its documentation describes a catalog of animated components, key-free browsing, and a free API key for source fetches with a daily limit. This evaluation treats OriginKit as an optional design/component source rather than part of Munin core infrastructure.
