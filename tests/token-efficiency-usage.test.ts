import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, normalizeTokenUsage } from '../src/token-efficiency-usage.js';

test('provider usage remains provider reported and totals are normalized', () => {
  const sample = normalizeTokenUsage({ inputTokens: 100, outputTokens: 25, providerId: 'ollama' });
  assert.equal(sample.inputTokens, 100);
  assert.equal(sample.outputTokens, 25);
  assert.equal(sample.totalTokens, 125);
  assert.equal(sample.providerId, 'ollama');
  assert.equal(sample.quality, 'provider_reported');
  assert.equal(sample.costUsd, undefined);
});

test('missing usage is unavailable and unknown models have no invented cost', () => {
  const sample = normalizeTokenUsage({ modelId: 'unknown-model' });
  assert.equal(sample.quality, 'unavailable');
  assert.equal(sample.totalTokens, undefined);
  assert.equal(sample.costUsd, undefined);
});

test('local estimation is deterministic and explicitly estimated', () => {
  const sample = normalizeTokenUsage({ inputText: 'four short words here' });
  assert.equal(sample.quality, 'estimated');
  assert.equal(sample.inputTokens, estimateTokens('four short words here'));
  assert.equal(sample.totalTokens, 6);
});

test('invalid negative or non-finite usage is unavailable', () => {
  const sample = normalizeTokenUsage({ inputTokens: -1, outputTokens: Number.NaN, costUsd: Number.POSITIVE_INFINITY });
  assert.equal(sample.quality, 'unavailable');
  assert.equal(sample.inputTokens, undefined);
  assert.equal(sample.costUsd, undefined);
});
