# Career Command workbench

The career page now groups the work into Opportunities, Pipeline and Agenda. It uses the existing local job/email stores and existing intake, packet, sync and lifecycle routes. No paid inference, new framework or external font is required.

## Behavior

- A single workspace read returns the canonical processes, brief, recommendations and last inbox import. Calendar and interview preparation load independently; their failure does not erase the pipeline. Refreshes have a 30-second bound and avoid overlapping loads.
- Opportunities have search, minimum signal score, alert reception window and ordering. The reception date is not labeled as the original vacancy publication date. Availability is explicitly unverified.
- Public HTTPS job links are extracted from email evidence, shown with safe external-link semantics and preserved when importing a discovery. Company and title are confirmed before saving. Saving a job is distinct from submitting a candidature.
- Repeated alerts are grouped by normalized URL or explicit company/title. A title alone, or an empty token set, cannot identify an existing job. Existing discovered/investigating jobs are distinct from applied/interview/offer records. Later alerts for closed/rejected processes are exposed for revalidation.
- Job alerts do not borrow another company's identity or advance a stage. Legacy saved alert suggestions are also prevented from marking an imported discovery as applied.
- A process dialog records stage/next action and exposes email evidence and the governed application packet. Invalid stages are rejected. Terminal updates clear follow-ups. Handled or older emails cannot override a manual stage/action update, and recent manual activity prevents a false stale warning.
- Metrics lead to the corresponding pipeline view, including due follow-ups and offers. Calendar connection problems lead to the existing Inbox connection screen; the page does not silently delete/recreate OAuth credentials.

## Design and accessibility

The existing shared navigation remains. The new career surface uses scoped variables mirroring the canonical dark surfaces, semantic colors and sans system stack. Canonical tokens and observation settings were not changed. Search/controls have labels and visible focus, touch controls are at least 44px high, dialogs use native focus containment and Escape behavior, source states include text, and reduced-motion preferences are respected.

The observation checker reported 1,401 findings versus 1,419 before this change. The career surface accounts for 17 findings: 15 color literals (scoped canonical palette, backdrop and theme metadata), one inherited font declaration and one semantic circular status marker. These are telemetry; no unrelated screen was migrated.

## Validation executed

- `MUNIN_WEB_OUT_DIR=/tmp/munin-career-web npm test`: 899 passed, 0 failed; includes core/web build and HTTP persistence/regression coverage.
- Frontend TypeScript check with JSX and bundler resolution: passed.
- `node scripts/design-drift-checker.mjs design/drift.config.json`: observation completed.
- `scripts/verify-career-command.cjs`: real local API + isolated synthetic fixture; search/filter, keyboard dialog, stage persistence, preparation packet, offer/follow-up navigation, optional Calendar failure, discovery import/link persistence, reload, no uncaught page errors, and no horizontal overflow at 320/390/768/1440px.

The optional browser suite requires Playwright available to the environment. Run `npm run build`, then `MUNIN_PLAYWRIGHT_MODULE=/absolute/path/to/playwright node scripts/verify-career-command.cjs`. `MUNIN_CHROMIUM_EXECUTABLE` may point to an already installed Chromium. Test state is temporary and removed; screenshots are written to ignored `.artifacts/`.

## Operational acceptance remaining

The Windows device was reported offline during this work. This change has not been installed/restarted on that host. Its private pipeline, Gmail/Outlook authorization, background email worker health and actual iPhone browser still need on-device acceptance. This screen reads the existing radar sources; it does not introduce unrestricted web scraping, new job feeds or automatic external applications. Keyword scores remain heuristic and salary, residence/visa restrictions and opening status must be verified against the vacancy.
