# OpenDots selective adoption — 2026-10-11

## Evidence and identity

No case-insensitive `opendots` match existed in the Munin checkout at
`199e17caf51f3fac0c3fc5c60226b03ddcbc8a9f`. Default-branch GitHub code search
also returned no results. This establishes absence from that snapshot, not
from every historical or unmerged branch.

The name identifies several independent projects; they are not interchangeable:

| Repository | Observed requirements | Munin decision |
| --- | --- | --- |
| [CopilotKit/OpenDots](https://github.com/CopilotKit/OpenDots) | Node 24, CopilotKit Intelligence for conversations; local Docker evaluation or hosted/licensed service; separate model and optional voice/channel providers | Adopt the review-bound draft pattern in an existing Munin seam. Do not install a parallel workspace or conversation service. |
| [diggerhq/opendots](https://github.com/diggerhq/opendots) | OpenComputer account; agents and notes on OpenComputer; HTTPS tunnel for local development | Do not introduce hosted-agent dependence. |
| [Shashankss1205/OpenDots](https://github.com/Shashankss1205/OpenDots) | Linux/WSL2, Python 3.11+, Bubblewrap; CLI or API/Ollama model access; goal/event runtime | Keep as a research reference. A required Linux runtime would conflict with native Windows support and duplicate existing engineering/event orchestration. |

Primary implementation reference: CopilotKit/OpenDots commit
`625452e06cde74cb25b0ce319e2c1be0488f5a5f`, inspected through README,
`src/client/page-review-decision.ts`, `src/server/pages.ts`,
`src/server/page-service.ts`, and `src/shared/page-review.ts`.
Alternative README blob snapshots: diggerhq `33d4226a8b1e9a569461ba749317667d37380e4a`,
Shashankss1205 `c5004e53fd80ff9669001367356c9e7009c1a9c3`.
Requirements above are source observations, not live deployment verification.

## Capability comparison

| OpenDots pattern | Existing Munin seam | Result |
| --- | --- | --- |
| Review belongs to the exact draft; changed content needs a new review | `linkedin-publisher.ts` previously approved only a post ID | Implemented SHA-256 binding to the reviewed publication content. |
| Explicit handling of interrupted background work | `json-host-job-queue.ts`, Host Worker leases/reconciliation | Retain; consequential jobs already block automatic replay after lease expiry. |
| Per-specialist roles and tools | Agent registry, runtime adapters, action constitution | Retain; no second agent registry or connector authority. |
| Durable conversations, editable pages, separate work metadata | Control Room, Context Store, Second Brain, Knowledge Vault | Retain; no second source of truth. Full OpenDots editor parity is not claimed. |
| Computer isolation and human takeover | Execution workspace/sandbox, bounded browser sessions | Retain; authenticated browser-profile persistence and OpenBot computers are not installed. |
| Automatic Learning | Skill Promotion Gate, discovery observation mode | Retain; no automatic installation, execution or promotion. |
| Voice and Slack | Separate external-service setup | Deferred; no account, spending or external messaging change. |
| Revision checks for simultaneous document edits | JSON-backed single-owner content store | Not adopted as a database concurrency guarantee. This change binds reviewed snapshots; it does not add multi-process compare-and-swap. |

## Implemented behavior

Approval records now persist `approvalContentHash` over post ID, title, body,
themes, image prompt, visual concept and visual reference ID. Internal notes
and timestamps do not invalidate a review. Image file bytes are not covered;
references must remain immutable or be replaced with a new ID.

Preparing a publication package, scheduling, and confirming manual publication
all reject changed content or approvals predating the binding. Reapproval
captures the current payload and clears any prior schedule. The publisher queue
reports an outdated approval as a draft and hides its obsolete schedule while
preserving the stored record for audit. Published history remains published.
Publication stays manual-only and no dependency, cloud service, model route,
telemetry, recurring job or automatic external action is added.

Example: approve body A, edit it to B, then request its publication package.
The request is blocked until B is reviewed and approved. The same applies when
the draft changes after manual scheduling.

## Validation and rollout

The regression was reproduced before implementation: the changed draft's
publication package incorrectly succeeded. Focused tests then passed, including
every bound field, stale schedules, legacy records, metadata-only edits,
reapproval and preserved published history.

Run `npm test` for the complete core/web build and test suite. The change needs
no new setup after the normal repository update. Existing approved or scheduled
drafts without a content hash need one new approval before package preparation.
An already scheduled post on LinkedIn itself is not unscheduled by Munin.

Host deployment and Windows runtime validation require the host to be reachable.
The Desktop Commander device was offline during this implementation; no PC
installation or live external-service verification is claimed.
