import test from 'node:test';
import assert from 'node:assert/strict';
import { observeEfficiency } from '../src/efficiency-telemetry.js';

test('observable context efficiency is separate from non-billing credit proxy', () => {
  const observation = observeEfficiency({ runId: 'r1', selectedFiles: 2, candidateFiles: 20, inputChars: 10000, selectedChars: 2000, outputOriginalChars: 5000, outputRetainedChars: 900, capabilitiesConsidered: 8, capabilitiesActive: 2, reusedHistoryChars: 1200, modelTier: 'economy', reasonCode: 'deterministic-or-low-risk', zeroRiskMode: 'copy-only' });
  assert.equal(observation.contextEfficiency.avoidedContextChars, 8000);
  assert.equal(observation.contextEfficiency.truncatedOutputChars, 4100);
  assert.equal(observation.creditSavingsProxy.kind, 'estimated-avoidable-context-tokens');
  assert.equal('currency' in observation.creditSavingsProxy, false);
  assert.equal('realizedCredits' in observation.creditSavingsProxy, false);
});
