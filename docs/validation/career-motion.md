# Career Command visual motion — 2026-10-08

## Reference research

These are adaptation references, not copied assets or a replacement of Munin's canonical design constitution:

| Reference | Source evidence | Munin adaptation |
| --- | --- | --- |
| Lusion v3 | [CSS Design Awards WOTY 2023](https://www.cssdesignawards.com/sites/lusion-v3/44311): animated/WebGL portfolio and award listing | An original, lightweight vector composition establishes a visual signature in the career header. |
| Linear | [2026 interface refresh](https://linear.app/now/behind-the-latest-design-refresh): preserve dense task information, reduce competing visual weight, consistent controls | Keep pipeline actions readable beneath the expressive header; restrained semantic accents and clear information hierarchy. |
| Rauno Freiberg | [Craft gallery](https://rauno.me/craft): interaction prototypes, transitions, tabs and microinteractions | Brief entry/detail transitions and responsive hover/press feedback; no delayed access to controls. |

Source research used official award listings, the product's design article and the interaction gallery. The implementation is an original interpretation; it does not reproduce the source sites' scenes, branding, textures or code.

## Implemented scope

- Original SVG ribbons, points and orbit in the career header with CSS transform/opacity motion. This artwork is decorative and does not imply an active search or encode live job data.
- Responsive headline/layout, 200–320 ms result/dialog entry, bounded card staggering, subtle desktop hover and button press feedback.
- Score rings encode the existing heuristic score without changing its meaning, sorting or value. Text scores remain readable; the rings are hidden from assistive technology.
- A visible animation control persists the user's choice locally. System reduced-motion takes precedence, including media preference changes after load; all component motion and hover transforms stop.
- No new animation dependency, remote media, font request, paid service or canonical token change. The existing design checker remains in observation mode.

## Validation evidence

- Full core/web build and 914 tests passed.
- Frontend TypeScript passed.
- Browser acceptance passed keyboard dialogs, stored stage/next-action, import/link persistence, filtering, partial API failure, 320/390/768/1440px overflow checks, vector/ring rendering, pause persistence across reload and system reduced-motion suppression.
- Desktop/mobile screenshots were inspected. A synthetic-data recording demonstrates the actual rendered page; it is not a design mockup or a private-mailbox demonstration.
- Design observation: 1401 findings, unchanged from the preceding delivery. No governance mode or semantic token changed.

Windows installation/private-data acceptance and native iPhone performance remain unverified while the host is inaccessible. No frame-rate claim is made from browser layout checks.
