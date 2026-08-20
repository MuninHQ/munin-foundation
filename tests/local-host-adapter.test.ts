import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LocalHostAdapter } from '../src/local-host-adapter.js';

test('local adapter source forbids arbitrary shell execution and pins commands', async () => {
  const source = await readFile(new URL('../../src/local-host-adapter.ts', import.meta.url), 'utf8');
  assert.match(source, /shell: false/);
  assert.match(source, /\['fetch', 'origin', 'main'\]/);
  assert.match(source, /\['merge', '--ff-only', 'origin\/main'\]/);
  assert.match(source, /\['status', '--json'\]/);
  assert.doesNotMatch(source, /exec\(|spawn\(|Invoke-Expression|cmd\.exe|powershell -Command/);
});

test('restart remains fail-closed without supervised service boundary', async () => {
  const adapter = new LocalHostAdapter({ cwd: process.cwd() });
  await assert.rejects(() => adapter.restartMunin(), /intentionally unavailable/i);
});
