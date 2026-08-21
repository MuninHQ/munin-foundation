import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mobile Host Bridge API requires existing mobile auth and only enqueues typed jobs', async () => {
  const source = await readFile(new URL('../../src/host-mobile-api.ts', import.meta.url), 'utf8');
  assert.match(source, /mobileAuthorized/);
  assert.match(source, /JsonHostJobQueue/);
  assert.match(source, /HostBridgeWorker/);
  assert.match(source, /worker\.runUntilEmpty/);
  assert.match(source, /void drainQueue\(\)/);
  assert.match(source, /validateHostJob/);
  assert.match(source, /MuninHQ\/munin-foundation/);
  assert.match(source, /branch:'main'/);
  assert.doesNotMatch(source, /HostBridgeExecutor|LocalHostAdapter|execFile|spawn\(|shell\s*:/);
});

test('unified server routes host jobs before the generic mobile handler', async () => {
  const source = await readFile(new URL('../../src/server.ts', import.meta.url), 'utf8');
  const host = source.indexOf("['/api/mobile/host',handleHostMobileApi]");
  const generic = source.indexOf("['/api/mobile',handleMobileApi]");
  assert.ok(host >= 0 && generic >= 0 && host < generic);
});
