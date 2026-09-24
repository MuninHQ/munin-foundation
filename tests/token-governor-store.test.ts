import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { observeTokenUsage } from '../src/token-governor.js';
import { summarizeTokenGovernorObservations, TokenGovernorStore } from '../src/token-governor-store.js';

test('store redacts observations and skips malformed JSONL lines', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-token-governor-'));
  try {
    const file = path.join(dir, 'token-governor.jsonl');
    const store = new TokenGovernorStore(file);
    const secret = 'a'.repeat(24);
    const observation = observeTokenUsage({ runId: 'r1', source: 'terminal', capability: 'code', risk: 'medium', selectedProviderId: 'local', input: '', output: `FAIL Authorization: Bearer ${secret}\n${'noise\n'.repeat(100)}` }, { largeOutputChars: 50, maxSummaryChars: 180 });
    await store.append(observation);
    await appendFile(file, '{malformed}\n', 'utf8');
    const rows = await store.list();
    assert.equal(rows.length, 1);
    assert.doesNotMatch(JSON.stringify(rows[0]), new RegExp('a{24}'));
    assert.match(JSON.stringify(rows[0]), /REDACTED/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('metrics report estimated savings and zero applied changes', () => {
  const largeObservation = observeTokenUsage({ runId: 'large', source: 'tool', capability: 'code', risk: 'medium', selectedProviderId: 'local', input: 'request', output: 'header\n' + 'routine output\n'.repeat(3_000) + 'FAIL one test\nexit code 1' }, { largeOutputChars: 100, maxSummaryChars: 240 });
  const smallObservation = observeTokenUsage({ runId: 'small', source: 'tool', capability: 'write', risk: 'low', selectedProviderId: 'local', input: 'request', output: 'ok' });
  const metrics = summarizeTokenGovernorObservations([largeObservation, smallObservation]);
  assert.equal(metrics.observations, 2);
  assert.equal(metrics.oversizedObservations, 1);
  assert.ok(metrics.estimatedSavedTokens > 0);
  assert.ok(metrics.estimatedSavingsRatio > 0);
  assert.equal(metrics.appliedChanges, 0);
  assert.equal(metrics.byEffort.low, 1);
  assert.equal(metrics.byEffort.medium, 1);
});

test('store rejects invalid list bounds and missing files read as empty', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-token-governor-'));
  try {
    const store = new TokenGovernorStore(path.join(dir, 'missing.jsonl'));
    assert.deepEqual(await store.list(), []);
    await assert.rejects(() => store.list(0), /between 1 and 1000/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
