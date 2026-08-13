import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('HUD loads orchestration observability and reads trace API', async () => {
  const [client, observability] = await Promise.all([
    readFile('apps/web/public/munin-client.js', 'utf8'),
    readFile('apps/web/public/hud-orchestration.js', 'utf8'),
  ]);
  assert.match(client, /hud-orchestration\.js/);
  assert.match(observability, /\/api\/orchestration\/traces/);
  assert.match(observability, /Fallbacks/);
  assert.match(observability, /selectedProviderId/);
});
