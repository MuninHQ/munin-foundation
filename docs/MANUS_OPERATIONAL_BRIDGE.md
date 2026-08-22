# Manus Operational Bridge

## Purpose

Use the already-installed Manus Desktop/My Computer authorization for `munin-foundation-git` as a bounded operational executor while Munin remains the system of record and safety authority.

## Direction A — Munin to Manus

Munin creates allowlisted tasks through Manus API v2 and persists only the local operational record: `research`, `analysis`, `content-draft`, and `repository-diagnostics`.

The bridge defaults to `manus-1.6-lite`, five tasks/day and 600 declared credits/day. Local-only environment variables:

- `MANUS_API_KEY` — required locally; never stored in Git or returned by status APIs.
- `MANUS_AGENT_PROFILE` — optional; defaults to `manus-1.6-lite`.
- `MANUS_DAILY_CREDIT_BUDGET` — optional; defaults to `600`.
- `MANUS_MAX_TASKS_PER_DAY` — optional; defaults to `5`.

Run `npm run manus:worker` to poll asynchronous results. Completed, failed or waiting tasks appear in the Action Inbox. Waiting tasks never receive an automatic consequential confirmation.

## Direction B — Manus/GitHub to the Windows host

The Host Worker polls `munin-host-inbox` for a short-lived typed `host-intent.json`. `deploy-main` performs one fixed sequence: fetch `origin/main`, require clean `main`, merge `--ff-only`, run the complete suite, request supervised restart, and recheck API/web health.

No arbitrary remote shell is exposed. The intent is valid for at most 15 minutes, replay-protected and restricted to `MuninHQ/munin-foundation:main`.

Terminal results are returned as a sanitized `host-result.json` on the dedicated `munin-host-outbox` branch. The worker publishes only receipts for typed GitHub jobs, redacts credential-shaped output and uses fixed shell-free Git commands. Build artifacts under `dist` and `dist-web` are cleaned before and after verification so a successful deployment leaves the checkout ready for the next intent.

```json
{
  "version": 1,
  "id": "deploy-20260822-001",
  "type": "deploy-main",
  "createdAt": "2026-08-22T12:00:00.000Z",
  "expiresAt": "2026-08-22T12:15:00.000Z",
  "repo": "MuninHQ/munin-foundation",
  "branch": "main"
}
```

## One-time activation after merge

The Manus Desktop folder authorization already exists. Remaining activation:

```powershell
npm run host:worker:startup:install
npm run manus:worker:startup:install
```

The API key, if not already created, must be added to the Windows user environment outside the repository. Host deployment works independently; Munin-to-Manus delegation stays disabled until the key exists.

## Manus Desktop operating instruction

> Operate only inside the already-authorized `munin-foundation-git` folder. Never force-push, reset, delete, publish, send messages, buy credits or expose credentials. For an approved Munin release, create only a short-lived typed `deploy-main` Host Inbox intent. Let the resident Munin Host Worker perform pull, tests, supervised restart and health verification. Treat a dirty worktree, non-main branch, failed test, stale supervisor, credential request or irreversible action as a human boundary and return evidence instead of bypassing it.
