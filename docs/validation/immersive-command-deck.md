# Immersive command deck and memory constellation

This update applies a command-deck composition to the existing HUD and shared workspace. It reuses the HUD's canvas renderer and existing React core rather than adding an inference provider or design framework. Voice is outside this change.

## Behavior

- The shared presence controller tracks real operation IDs. Finishing one request cannot conceal another pending request, and a simultaneous success cannot erase an API failure. Both React and standalone pages consume this presentation state.
- The Home core and HUD respond to pending/success/failure states. Opening an editor alone is no longer presented as execution. Command submission is disabled while its request is pending.
- Shared surfaces, focus states and transitions extend across all 29 entry points. Existing motion preferences, reduced-motion support and approval paths remain in place. The Career HUD shortcut opens the current workbench.
- Memory renders a read-only 3D projection of actual context sections and Control Room timeline entries. Lines describe source membership, not inferred semantic relationships. Sensitive-private context values are excluded. Search, source filters, pointer rotation, a keyboard rotation slider, keyboard node selection and a list alternative are available. The displayed map is bounded to 48 matching records; filtering searches the complete received set.
- A failed memory refresh reports unavailable sources and preserves the last available view.

## Verification

Run `npm test` and an explicit frontend type check:

```sh
npx tsc --noEmit --jsx react-jsx --module esnext --moduleResolution bundler --target es2022 --esModuleInterop --skipLibCheck --lib dom,dom.iterable,es2022 apps/web/src/main.tsx
```

Browser acceptance uses an isolated synthetic data directory and real local APIs. It checks 29 routes at 1440px/390px, Career persistence, memory search/rotation/keyboard focus, exclusion of sensitive values, command navigation, persistent motion and system reduced-motion preference:

```sh
MUNIN_PLAYWRIGHT_MODULE=/path/to/playwright MUNIN_CHROMIUM_EXECUTABLE=/path/to/chromium node scripts/verify-workspace-ui.cjs
```

`MUNIN_RECORD_VIDEO=1 MUNIN_IMMERSIVE_TOUR=1` records a short real-browser demonstration with synthetic data. Browser/FFmpeg dependencies are test tools, not Munin runtime dependencies. Screenshots and reports are generated under `.artifacts/` and are not committed.

Design observation remains diagnostic. Canonical tokens and governance are unchanged. The map's projection dimensions and restrained local composition colors remain local values. The diagnostic count is 1,571 versus 1,520 before this change (+51, predominantly raw color literals); these observations do not trigger an automatic migration.

Local browser verification does not establish installation on Windows, physical iPhone performance, or connectivity of private Gmail/LinkedIn accounts. No changes to those integration permissions or execution gates are included.
