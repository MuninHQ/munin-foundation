import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Host Bridge CLI accepts only typed JSON input and local governed executor', async () => {
  const source = await readFile(new URL('../../src/host-bridge-cli.ts', import.meta.url), 'utf8');
  assert.match(source, /JSON\.parse/);
  assert.match(source, /HostBridgeExecutor/);
  assert.match(source, /LocalHostAdapter/);
  assert.doesNotMatch(source, /exec\(|execFile|spawn\(|shell\s*:/);
});

test('package exposes a build-before-run Host Bridge command', async () => {
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['host:bridge'], 'npm run build:core && node dist/src/host-bridge-cli.js');
});
