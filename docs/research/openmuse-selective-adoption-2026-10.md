# OpenMuse selective adoption audit — 2026-10-03

Reference snapshot:
- OpenMuse: `CopilotKit/openmuse@b06caad7005ac5b6d2b451752a3794a6ae1759c1`
- Munin baseline: `MuninHQ/munin-foundation@f87ff243e18db89a2876c675986842e7d42c410e`
- Constraint: no mandatory paid cloud, no new model/API spend, fail closed on consequential actions.

## Module-by-module comparison

| OpenMuse pattern | Munin before this change | Decision | Implementation |
| --- | --- | --- | --- |
| Durable tasks with leases, expiry recovery, pause/resume | Durable effect ledger existed, but the JSON Host Bridge queue could strand a job forever in `running` after a worker crash | Adopt the lease/recovery pattern conservatively | Host jobs now have leases, heartbeats and attempts. Expired observation/test jobs may retry; potentially consequential jobs are blocked for reconciliation instead of replayed blindly. |
| Persistent Chromium sessions | Browser inspection used a random named Playwright session but always closed it after one snapshot | Adopt a bounded read-only continuity mode | Added explicit open/snapshot/close lifecycle for named Playwright sessions. Automated click/type/submit remain outside the promoted capability. |
| Human takeover | Munin already separates agent execution from human approvals, but browser inspection had no stable handoff identity | Adopt only the safe handoff primitive | Session results expose a stable session ID and explicitly mark automatic input as disallowed. Full remote-control UI is not copied. |
| Evidence attached to tasks/artifacts | Execution receipts persisted evidence strings and fingerprints, but generic provenance was not hash chained | Adopt | Added a tamper-evident JSONL evidence ledger with redaction, content hashes, parent links and chain verification. |
| Action approvals and outcome-unknown handling | ApprovalExecutor already has idempotency keys, reconciliation-required state and adapters | Keep Munin implementation | No replacement. OpenMuse confirms the direction but does not justify duplicating the subsystem. |
| Persistent Linux computer workspace | Munin already has governed Git worktree execution plus sandbox strength reporting | Keep Munin implementation | No second computer runtime. Avoids Docker/E2B duplication and a larger attack surface. |
| SQL/PGlite multi-worker task store | Munin Host Bridge is local-first and JSON-backed | Partial adoption only | Added in-process serialization, leases and crash recovery. Multi-process CAS/SQL remains a future migration if Munin truly needs concurrent workers. |
| Rich mobile browser console | Munin already has HUD/mobile approval surfaces | Defer | Copying OpenMuse's console would expand browser mutation surface. Current session ID is sufficient for a human-controlled handoff. |
| Google mail/calendar integrations | Munin already has Gmail/calendar paths and worker integrations | Keep | No duplicate connector layer. |
| Paid browser/computer cloud | Conflicts with Munin zero-cost requirement | Reject | No E2B or mandatory hosted worker dependency added. |

## Security boundaries preserved

1. Browser automation remains read-only at the promoted capability boundary. The new lifecycle can open, snapshot and close a named session; it cannot click, type or submit.
2. A crashed consequential Host Bridge job is never automatically replayed. It becomes blocked with an explicit reconciliation message.
3. Only clearly retry-safe host observations/tests are automatically eligible for recovery.
4. Evidence content is hashed, not duplicated into the ledger. Secret-like text and sensitive metadata fields are redacted before persistence.
5. No new runtime dependency or paid service was added.

## Files changed

- `src/browser-session.ts`
- `src/browser-capability.ts`
- `src/browser-operator.ts`
- `src/json-host-job-queue.ts`
- `src/host-bridge-worker.ts`
- `src/evidence-ledger.ts`
- tests covering browser session IDs, host lease recovery/replay safety and evidence tamper detection.

## Deferred deliberately

OpenMuse persists full Chromium profiles on disk and has a richer live console. Munin does not claim equivalent cross-reboot authenticated-browser persistence in this change. Adding saved cookies/login state would create a materially more sensitive local data store and should only be promoted with explicit storage encryption/retention controls and dedicated threat-model tests.

Likewise, OpenMuse's database-backed compare-and-swap worker model is stronger for concurrent worker processes. Munin's current local JSON queue is intentionally kept smaller; if more than one Host Bridge worker is ever supported, the queue should move to an actual transactional store rather than pretending the JSON file is multi-process safe.
