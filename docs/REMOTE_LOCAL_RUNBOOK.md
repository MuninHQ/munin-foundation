# Munin Local and Remote Runbook

Canonical operator runbook for the Windows Munin host and remote/mobile access.

## Canonical checkout

Use one checkout only for runtime operations:

```powershell
D:\Dev\munin-foundation-git
```

Before starting:

```powershell
cd D:\Dev\munin-foundation-git
git fetch origin
git checkout main
git pull origin main
```

Do not run another checkout on the same API/web ports. The launcher intentionally reuses a healthy service already bound to the configured port, so a stale Vite process can make a different checkout appear current.

## Ports

- Web UI: `5173`
- Unified API: `4310`
- Both may be overridden with `MUNIN_WEB_PORT` / `MUNIN_API_PORT`.

Check ownership before debugging stale UI:

```powershell
Get-NetTCPConnection -LocalPort 5173,4310 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Stop stale processes only when intentionally restarting Munin:

```powershell
Get-NetTCPConnection -LocalPort 5173,4310 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## Start

```powershell
npm install
npm run workspace
```

`npm run workspace` builds the TypeScript core if needed, starts the unified API, starts Vite, waits for readiness and opens the UI.

Health checks:

```text
http://127.0.0.1:4310/api/health
http://127.0.0.1:5173/
```

## Update after a GitHub build

For source-only changes, dependencies normally do not need reinstalling:

```powershell
git pull origin main
```

Restart only when backend code or launcher/runtime state requires it. Vite usually hot-reloads frontend files, but a clean restart is the deterministic recovery path.

Full deterministic refresh:

```powershell
Get-NetTCPConnection -LocalPort 5173,4310 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
git pull origin main
npm install
npm run build
npm test
npm run workspace
```

## Remote access with Tailscale

The default web launcher binds to `127.0.0.1` for local safety. Remote access requires the mobile/remote launcher or an explicitly governed host binding. Do not expose port `4310` directly to the public internet.

When the remote launcher is active on the Tailscale interface, use the host's current Tailscale IP plus the web port, for example:

```text
http://<tailscale-ip>:5173/
```

Tailscale provides the network boundary; Munin remains a local single-user product. Keep the API behind the Vite proxy rather than advertising `:4310` as an external endpoint.

## Career quick intake

Desktop/local:

```text
http://127.0.0.1:5173/career-intake.html
```

From a governed Tailscale web session:

```text
http://<tailscale-ip>:5173/career-intake.html
```

The intake accepts a public job URL, pasted job text, file selection, drag/drop and pasted screenshots. Screenshots are transient and are not intentionally persisted by the intake pipeline.

## Troubleshooting order

1. Confirm canonical checkout and `git log -1 --oneline`.
2. Confirm expected source file exists locally.
3. Inspect owners of ports `5173` and `4310`.
4. Stop stale processes.
5. Run `npm run build`.
6. Run `npm test`.
7. Start with `npm run workspace`.
8. Open the failing URL directly instead of navigating through cached tabs.
9. Use `Ctrl+F5` after a frontend update.

## Recovery boundaries

Safe/reversible actions such as restart, rebuild and read-only health checks may be automated. Credential entry, 2FA, OAuth approval, public publication and other consequential external actions remain human boundaries.
