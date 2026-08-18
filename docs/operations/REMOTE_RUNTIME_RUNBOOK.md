# Munin Local + Remote Runtime Runbook

> Canonical operating procedure for the current v0.1 host model. The PC remains the runtime; remote/mobile access does not create a public cloud deployment.

## Runtime model

```text
Local PC
  ├─ unified API — 127.0.0.1:4310 by default
  ├─ Vite web/mobile surface — :5173 by default
  ├─ private runtime state — data/runtime/
  └─ optional Tailscale Serve
        ↓ private tailnet HTTPS
      iPhone / trusted remote device
```

The raw API remains localhost-bound. The mobile launcher exposes the web surface, whose `/api` requests are proxied locally. Tailscale Funnel/public exposure is not part of the Munin operating model.

## Normal start

From the repository root:

```bash
npm run mobile
```

The launcher performs the supported startup sequence:

1. build core TypeScript;
2. create/reuse `data/runtime/mobile-token.txt` unless `MUNIN_MOBILE_TOKEN` is supplied;
3. reuse a compatible local API or restart a stale/incompatible Windows listener when safe;
4. start the unified API on localhost;
5. start the web surface on `MUNIN_WEB_PORT` / 5173;
6. attempt `tailscale serve --bg <web-port>` when Tailscale is installed;
7. print the private Tailscale HTTPS URL and trusted-LAN fallbacks.

Do not manually expose API port 4310 to the internet.

## Health check

After startup, use the repository-backed status path:

```bash
npm run operator:sitrep
```

or, through the local unified API:

```text
GET /api/orchestrate/status
```

The status snapshot reports:

- Control Room canonical-state readiness;
- queued/running/completed/failed/needs-user engineering jobs;
- Playwright verification availability and read-only policy;
- Memory Ledger entry count;
- Gmail/Outlook connection and read-only security state.

`blocked` means canonical Control Room files are missing. `attention` means the runtime is usable but one or more surfaces need review, such as failed jobs or unavailable browser verification.

## First remote/mobile access

1. Ensure the host PC is online and `npm run mobile` is running.
2. Ensure the remote device is on the same Tailscale tailnet.
3. Open the launcher-provided HTTPS URL ending in `/mobile.html`.
4. Enter the generated mobile bearer token on first access.
5. Optionally add the page to the device home screen.

If Tailscale Serve requires one-time consent, follow the Tailscale CLI consent flow emitted by the launcher. That is an external owner-controlled permission boundary.

## Token handling

The generated mobile token is stored at:

```text
data/runtime/mobile-token.txt
```

The directory is runtime/private state and must remain outside Git. To rotate the token:

1. stop the mobile runtime;
2. delete `data/runtime/mobile-token.txt`;
3. run `npm run mobile` again;
4. enter the new token on remote devices.

OAuth provider tokens are separate and remain in local runtime state. Their read-only connector permission contract does not make local token storage risk disappear; see `docs/EXTERNAL_CONNECTOR_SECURITY.md`.

## Windows startup

To launch Munin Mobile when the Windows user signs in:

```bash
npm run mobile:startup:install
```

This installs a Startup-folder shortcut that runs `npm run mobile` from the repository root. Remove it with:

```bash
npm run mobile:startup:remove
```

The startup shortcut is convenience only; it does not bypass Windows login, Tailscale authentication, mobile bearer authentication or Munin action guardrails.

## Recovery matrix

| Symptom | Supported recovery |
|---|---|
| Mobile page unavailable | Confirm host is online; run `npm run mobile`; inspect launcher output and `npm run operator:sitrep`. |
| API port occupied by an incompatible process | On Windows the launcher attempts a scoped restart of the listener; if that fails, stop the conflicting process and rerun. |
| Tailscale installed but no HTTPS URL | Run the exact `tailscale serve --bg <web-port>` consent/configuration flow printed by the launcher. |
| LAN works but remote tailnet does not | Treat as Tailscale/network state, not a reason to expose the raw API publicly. |
| Token rejected | Confirm the current generated token or rotate it deliberately; do not log/store it in Git. |
| Engineering job becomes `needs_user` after restart | The job manager intentionally does not replay uncertain external effects; review the preserved objective/checkpoint before resuming. |
| Browser verification unavailable | Munin can report the capability as unavailable; do not fabricate browser evidence. |

## Security invariants

- raw API remains localhost-bound by default;
- remote access is private-tailnet-first;
- no Tailscale Funnel/public exposure;
- `/api/mobile/*` remains bearer-authenticated;
- generated tokens and OAuth credentials remain outside Git;
- remote access does not bypass Action Constitution or human-only blocker classification;
- credentials, 2FA, public publication, payments and irreversible high-impact actions remain explicit human boundaries.

## Evidence boundary

Repository tests can prove the launcher/configuration contracts, but they cannot prove that a particular PC, router, Tailscale account or iPhone is currently online. Real-device connectivity is operational evidence and must be observed on the target environment.
