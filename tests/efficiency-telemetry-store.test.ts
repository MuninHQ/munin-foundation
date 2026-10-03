import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { observeEfficiency } from '../src/efficiency-telemetry.js';
import { EfficiencyTelemetryStore } from '../src/efficiency-telemetry-store.js';

test('store redacts observations and ignores malformed historical rows', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-efficiency-'));
  const file = path.join(dir, 'observations.jsonl');
  try {
    const store = new EfficiencyTelemetryStore(file);
    await appendFile(file, '{bad json}\n', 'utf8');
    const observationWithSecret = observeEfficiency({ runId: `ghp_${'a'.repeat(24)}`, selectedFiles: 1, candidateFiles: 2, inputChars: 100, selectedChars: 50, outputOriginalChars: 10, outputRetainedChars: 10, capabilitiesConsidered: 1, capabilitiesActive: 1, reusedHistoryChars: 0, modelTier: 'economy', reasonCode: 'safe', zeroRiskMode: 'disabled' });
    await store.append(observationWithSecret);
    const bytes = await readFile(file, 'utf8');
    assert.doesNotMatch(bytes, /ghp_[a-z0-9]+/i);
    assert.equal((await store.list()).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
