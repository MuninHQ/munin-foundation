# Brand Asset Registry v1

The Brand Asset Registry operationalizes `docs/BRAND_CANON.md`.

## Non-negotiable invariant

A brand mark is a static canonical asset, never generative content. Image generation produces artwork only. A renderer/compositor may add a registered mark only when its registry status is `active` and `canonicalPath` points to the approved master file.

If a requested mark is missing, reserved or awaiting its master file, the correct output is an unbranded image. The system must never ask an image model to recreate, approximate or stylize the mark.

## Registry

Machine-readable source: `assets/brand/registry.json`.

Canonical IDs:

- `aj-master` — default personal/editorial social mark.
- `munin-raven-seal` — Munin product identity only.
- `odin-mark` — Odin specialist contexts only.
- `document-seal` — formal document contexts only.

## Activation procedure

1. Obtain the exact approved master artwork from the owner.
2. Store it under `assets/brand/masters/` without altering geometry.
3. Prefer SVG plus a transparent high-resolution PNG export.
4. Update `canonicalPath` and change `status` to `active` in `registry.json`.
5. Never recolor, regenerate, trace, add glow, add runes, alter proportions or merge the mark into the generated scene.

## LinkedIn rule

LinkedIn artwork defaults to `aj-master`. The artwork generator receives no AJ/logo instructions. After artwork generation, the compositor checks the registry. If `aj-master` is active, it places the exact asset in the configured safe area at no more than 7% of image width. Otherwise it returns the clean artwork unchanged.

This registry overrides any historical prompt, visual profile or example that contains a different AJ interpretation.
