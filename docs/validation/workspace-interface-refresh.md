# Workspace interface refresh

Scope: all 29 web entry points, including desktop HUD, HUD Mobile, React Home,
Mobile, Career, email, operator surfaces, memory, intelligence, content and
LinkedIn tools. This extends the Career workbench direction across the existing
application; it does not replace its backend or introduce a paid dependency.

## Presentation and navigation

- Shared `munin-workspace.css` reuses canonical canvas/base/raised surfaces,
  text, borders, blue intelligence accent, 8/16px radii and 200/320ms motion.
  Large title sizes are local responsive values; canonical tokens are unchanged.
- Standalone pages use the same header treatment, cards, focus rings and touch
  controls. HUD retains its interactive core with clearer panels and clock.
- All modules are searchable in a native dialog. Keyboard focus stays inside;
  Escape closes it and the browser restores focus. Mobile keeps five primary
  destinations and exposes the header/tools menu.
- Root/public shared navigation and primitive styles are synchronized. Portfolio
  and Email Intelligence are now explicit production build inputs.
- The Portuguese Home Career shortcut opens the current Career workbench.
- The global animation preference persists and honors system reduced motion.
  It also pauses HUD canvas phases and the React GSAP/Lenis/GPU runtime without
  overwriting the existing detailed visual preferences.
- Action Inbox starts after the shared client is ready. Optional mobile service
  worker registration failures no longer produce an unhandled rejection.
- HUD priorities render independently of optional memory, asset and LinkedIn
  source requests, so a slow secondary module does not block the command surface.

Design observation: 1,520 findings versus 1,401 at the starting revision (+119),
primarily explicit color literals in the shared refresh and synchronized fallback
styles. This is diagnostic telemetry; observation mode and canonical tokens were
not changed. Existing out-of-scope findings were not automatically rewritten.

## Reproducible browser walkthrough

Run `npm run build`, then:

```sh
MUNIN_PLAYWRIGHT_MODULE=/path/to/playwright \
MUNIN_CHROMIUM_EXECUTABLE=/path/to/chromium \
node scripts/verify-workspace-ui.cjs
```

Add `MUNIN_RECORD_VIDEO=1` to record the same real browser session. The script
starts the local backend and web server, uses an isolated temporary data folder,
creates fictional projects/actions/research through actual HTTP endpoints, and
navigates every entry point. It exercises Home and Mobile sections, module
search, dialog closing, Career next-action persistence, global motion persistence
and system reduced motion. Recording also queries HUD priorities and local
chat SITREP. It performs no external publication, application or approval.

Screenshots, the route/error/overflow report and raw video are ignored artifacts.
The temporary runtime is removed after execution. The mobile token is synthetic
and valid only for that isolated process. Browser service workers are blocked
to avoid PWA cache/navigation interference; offline PWA installation is outside
this acceptance run.

## Deployment boundary

Executed validation: 914/914 automated tests passed; explicit frontend TypeScript
checking passed for desktop and mobile entries. Browser acceptance covered all 29
routes at 1440px and 390px with no uncaught JavaScript errors and no horizontal
overflow beyond a 1px rounding tolerance. Home-to-Career routing was separately
exercised after the data-section fix. The delivered walkthrough is 172 seconds,
1440×1000 H.264, using the same isolated local runtime.

Browser evidence concerns this local implementation with fictional data. It is
not evidence of Windows installation, private email synchronization, external
LinkedIn access or physical iPhone acceptance. The Windows device was offline
during this task.
