const mode = process.argv.includes('--kiosk') ? 'kiosk' : 'app';
process.env.MUNIN_START_PAGE = 'hud.html';
process.env.MUNIN_BROWSER_MODE = mode;
await import('./launch.mjs');
