# Munin Mobile Gateway

## What it is

Munin Mobile keeps the PC as the runtime and turns the iPhone into a secure command surface. No cloud runtime is required.

`iPhone → Tailscale Serve (private HTTPS) → Munin mobile web → authenticated mobile API → local Munin runtime`

## Start on the PC

From the repository root:

```bash
npm run mobile
```

The launcher:

1. builds the TypeScript runtime;
2. starts the unified Munin API on localhost when needed;
3. starts the Vite web surface on the LAN-capable web port;
4. creates/reuses a persistent random Mobile token under `data/runtime/mobile-token.txt`;
5. detects Tailscale and attempts `tailscale serve --bg <web-port>`;
6. prints the private HTTPS/MagicDNS URL when available plus LAN fallback URLs.

The runtime token directory is already ignored by Git.

## First access from iPhone

1. Keep the host PC online and Munin Mobile running.
2. Connect the iPhone to the same Tailscale tailnet.
3. Open the HTTPS URL printed by `npm run mobile`, ending in `/mobile.html`.
4. Enter the token printed by the launcher once. The browser stores it locally on that device.
5. In Safari, use **Share → Add to Home Screen** for an app-like entry point.

If Tailscale Serve requires one-time HTTPS/Serve consent, its CLI output provides the consent flow. Munin does not use Tailscale Funnel and should not be made public.

## Mobile capabilities

The first mobile surface provides:

- current top Goal and progress;
- Goals and pending Actions;
- SITREP;
- free-form Munin assistant command input;
- `Continuar sozinho`, invoking the bounded Autonomous Goal Loop;
- visibility into genuine user-controlled boundaries through the Goal Loop/SITREP.

## Authentication

All `/api/mobile/*` routes require:

```text
Authorization: Bearer <MUNIN_MOBILE_TOKEN>
```

The API fails closed if no token is configured. Token comparison is timing-safe. Existing desktop APIs are not forced through this token, so desktop workflows remain compatible.

To rotate the generated token, stop Munin Mobile, delete `data/runtime/mobile-token.txt`, and run `npm run mobile` again. The iPhone will then need the new token.

## Network model

The unified API continues to bind to `127.0.0.1` by default. The mobile launcher also keeps the API on localhost; Vite proxies `/api` locally. Only the web surface is exposed to the tailnet/LAN. This avoids exposing the raw API port directly.

Tailscale Serve is preferred over LAN access because it provides a private tailnet path and HTTPS suitable for the installable/service-worker experience. LAN URLs are intended as a fallback on trusted local networks.

## Safety

Mobile access does not bypass Munin autonomy guardrails. The Goal Loop may continue local/reversible zero-cost work, but actions with external or irreversible effects still stop as `needs_user`.
