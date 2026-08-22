---
name: ui-ux-pro-max
description: Design build and review Munin web and mobile interfaces with deliberate UX accessibility responsive behavior and brand consistency.
version: 1.1.0
triggers: ui,ux,interface,frontend,front-end,layout,design system,design-system,component,componentes,responsive,responsivo,mobile,dashboard,hud,accessibility,acessibilidade,visual,css,react,vite,interaction,interacao,animation,animacao,chart,grafico
permissions: read,local-write
source: nextlevelbuilder/ui-ux-pro-max-skill,pbakaus/impeccable,Leonxlnx/taste-skill,greensock/gsap-skills-inspired-munin-adaptation
---
# UI/UX Pro Max — Munin Adaptation

Use this skill for work that creates, changes, audits, or verifies a Munin user interface. It is a Munin-native adaptation of ideas from `nextlevelbuilder/ui-ux-pro-max-skill`; it is not a requirement to install or execute the upstream CLI.

## Authority and constraints

Munin's repository is the source of truth. Before making visual changes, inspect the relevant product specification, existing components, `docs/BRAND_CANON.md`, and any brand or mobile guidance that applies. Brand Canon and explicit product requirements always override generic style recommendations. Preserve existing architecture and interaction contracts unless the objective explicitly requires changing them.

Do not introduce a new visual language merely because a style is fashionable. Prefer a coherent system over isolated decoration, and prefer the smallest change that produces a measurable usability improvement. Do not add paid services, remote dependencies, font packages, icon packs, animation libraries, or new frameworks when the existing stack can satisfy the objective.

## Workflow

For a UI objective, establish the user task and the target surface first. Then derive or confirm a compact design system for that surface: information hierarchy, spacing rhythm, typography roles, semantic colors, component states, interaction model, responsive behavior, and data-visualization choices where relevant. Reuse Munin primitives before creating new ones.

Implement the primary path before decorative refinement. Keep content readable at narrow widths and under text growth. Interactive controls must expose understandable labels, keyboard focus, touch-friendly targets, disabled/loading/error states when applicable, and behavior that remains correct when animation is reduced or interrupted.

Run two explicit critique passes after the primary path works. In the first, inspect hierarchy, grouping, density, typography, contrast, and whether the next action is obvious without explanation. In the second, remove decorative elements that do not improve comprehension, correct alignment and spacing drift, and verify that the result feels intentional rather than template-generated. Resolve the largest usability defect before polishing micro-details.

Treat responsive behavior as part of the component contract rather than a final CSS patch. Validate representative phone, tablet, laptop, and wide-desktop widths when the surface spans them. Avoid clipping, horizontal overflow, brittle fixed heights, inaccessible hover-only actions, and truncation that hides essential meaning without a way to recover the full value.

For dashboards and dense operational screens, optimize for scanability and decision speed. Establish a clear visual priority among status, exceptions, actions, and supporting detail. Use charts only when they communicate a comparison, trend, distribution, relationship, or progress state better than concise text or a table. Never use color as the sole carrier of meaning.

Use motion only to explain state, continuity, causality, or spatial relationship. Prefer CSS and the current stack for ordinary transitions. Add no animation library solely for polish. Respect reduced-motion preferences, avoid blocking interaction while motion completes, and verify that interruption leaves the interface in a valid state.

## Munin visual direction

For Munin product UI, retain the current dark executive operating-system character unless the objective says otherwise. Use restrained depth, disciplined contrast, purposeful cold-blue accents, clear typographic hierarchy, and generous enough spacing to avoid a game-HUD or cyberpunk advertising feel. The external inspiration is advisory; the Munin product should still look like Munin.

## Verification gate

Before declaring UI work complete, verify the actual rendered behavior when tooling permits. Check semantic structure, keyboard focus, contrast-sensitive states, readable labels, overflow, empty/loading/error conditions relevant to the change, reduced-motion behavior for nonessential animation, and responsive widths affected by the work. Pair implementation tests with browser-level verification for user-visible changes when the repository's browser capability is available.

A green unit test suite is necessary but not sufficient for a visual change. Completion requires evidence that the intended user task is clearer or safer, the Munin visual system remains coherent, and no adjacent workflow was accidentally degraded.
