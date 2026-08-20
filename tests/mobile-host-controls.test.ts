import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mobile entrypoint loads isolated Host Bridge controls', async () => {
  const html=await readFile(new URL('../../apps/web/mobile.html',import.meta.url),'utf8');
  assert.match(html,/host-mobile-controls\.ts/);
});

test('mobile Host Bridge UI only enqueues allowlisted governed jobs including supervised restart', async () => {
  const source=await readFile(new URL('../../apps/web/src/host-mobile-controls.ts',import.meta.url),'utf8');
  assert.match(source,/runtime-health/);
  assert.match(source,/git-fast-forward/);
  assert.match(source,/run-acceptance/);
  assert.match(source,/tailscale-health/);
  assert.match(source,/restart-munin/);
  assert.match(source,/Supervisor local estiver saudável/);
  assert.match(source,/\/api\/mobile\/host\/jobs/);
  assert.match(source,/Authorization/);
  assert.doesNotMatch(source,/execFile|spawn\(|shell\s*:/);
});
