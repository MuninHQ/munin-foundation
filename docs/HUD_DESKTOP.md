# Munin HUD Desktop Mode

The HUD can run as a dedicated Windows desktop-style window using Microsoft Edge app mode.

## Start

```cmd
npm run hud
```

This starts the unified Munin API, the Vite UI, validates `/api/health`, and opens `hud.html` in an Edge app window.

For fullscreen kiosk mode:

```cmd
npm run hud:kiosk
```

## Start with Windows

```cmd
npm run hud:startup:install
```

This creates a shortcut in the current user's Windows Startup folder. Remove it with:

```cmd
npm run hud:startup:remove
```

The shortcut only launches Munin; it does not store OAuth secrets or API keys.

## Safety

The launcher only reuses port 4310 when `/api/health` identifies a healthy `munin-workspace` service. If another or stale process occupies the port, startup stops instead of connecting the HUD to an unknown service.
