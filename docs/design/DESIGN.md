# Munin Design Constitution v1

Status: canonical design contract, observation phase.

This document defines the visual and interaction principles that Munin agents and contributors must preserve. It is intentionally vendor-neutral and is not a copy of any external brand system.

## Purpose

Munin should feel like a calm, high-trust operational command surface: information-dense without visual noise, dark-first, legible, fast to scan, and explicit about state, risk and agency.

The constitution exists to reduce design drift across human and AI contributors. During the observation phase it is advisory: violations are reported, never auto-fixed, and do not block merges.

## Core principles

1. Hierarchy before decoration. Every visual choice must improve comprehension, prioritization or actionability.
2. Dense but calm. Prefer compact information architecture, progressive disclosure and restrained chrome over empty spectacle or crowded dashboards.
3. Dark command-center baseline. Gunmetal/near-black surfaces, strong foreground contrast and disciplined accents are the default visual language.
4. Semantic color, not decorative color. Accent colors communicate meaning before mood.
5. Low chromatic noise. A screen should not compete with its own information.
6. Motion serves comprehension. Animation may orient, confirm or explain; it must not delay work or become ambient distraction.
7. Reuse before invention. Existing components, patterns and tokens should be preferred over one-off styling.
8. Accessibility is part of quality. Contrast, focus, keyboard use, readable sizing and non-color-only states are required design concerns.
9. Evidence over imitation. External products may be studied as references, but their visual language never overrides Munin's identity.
10. Reversibility over silent mutation. Agents must not silently rewrite canonical tokens or mass-restyle existing screens.

## Semantic state model

- `critical` / red: failure, destructive action, severe risk or blocked critical path.
- `attention` / amber: warning, uncertainty, degradation or intervention likely to be useful.
- `intelligence` / blue: information, active intelligence, selection and trusted system guidance.
- `healthy` / green: confirmed, successful, available or healthy state.
- `neutral` / gray: secondary context, passive metadata and structural information.

Color must not be the sole carrier of state; pair it with text, iconography, shape or position where consequential.

## Surfaces and hierarchy

- Prefer layered dark surfaces with subtle luminance separation rather than heavy shadows.
- Reserve elevated/glowing treatments for active focus, important live state or exceptional emphasis.
- Avoid large soft shadows, glass effects, gradients and glow when they do not encode hierarchy or state.
- Primary content must remain visually dominant over navigation and ornament.

## Typography

- Use the tokenized sans-serif system stack unless a future accepted ADR introduces a canonical typeface.
- Use weight, size and spacing to communicate hierarchy before introducing additional colors.
- Avoid more than three materially distinct typographic emphasis levels in a single compact region.
- Dense operational data should remain readable at normal desktop and mobile viewing distances.

## Spacing and shape

- Use the canonical spacing and radius scales from `design/tokens.json`.
- Compact operational controls should favor smaller radii; large pill-shaped controls are reserved for semantics that genuinely benefit from them.
- Repeated structures should align to a consistent rhythm rather than isolated pixel values.

## Interaction

- Every actionable element should make its state and consequence understandable before activation.
- Focus, hover, selected, disabled, pending, success and failure states should be distinguishable.
- Consequential actions must remain compatible with Munin approval and safety gates.
- Do not hide essential state behind hover-only interactions.

## Responsive behavior

- Preserve task hierarchy when moving from desktop to mobile; do not merely shrink a desktop composition.
- Collapse secondary context before removing primary actions or status.
- Touch targets must remain usable and critical labels must not depend on hover.

## Agent rules

Before UI work, agents must read this document, `design/tokens.json` and `docs/design/AGENT_CONTRACT.md`.

Agents should:

- prefer semantic tokens and existing components;
- flag a missing token instead of inventing a new canonical value silently;
- keep design changes scoped to the requested surface;
- treat external design systems as research evidence only;
- submit any proposed canonical rule change for explicit review;
- never auto-promote a discovered external pattern through the Skill Promotion Gate.

## Observation phase

The drift checker runs in `observe` mode. Findings are telemetry, not merge blockers. It must not rewrite files, modify tokens, refactor screens or promote rules automatically.

Promotion path for future enforcement:

`observe -> review evidence -> calibrate false positives -> explicit approval -> warn -> explicit approval -> enforce`

No transition may happen implicitly.
