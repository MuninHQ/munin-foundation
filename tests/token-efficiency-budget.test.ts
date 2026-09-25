import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTokenEfficiencyConfig } from '../src/token-efficiency-config.js';
import { evaluateContextBudget } from '../src/token-efficiency-budget.js';

const config = loadTokenEfficiencyConfig({});

test('budget states honor exact boundaries', () => {
  assert.equal(evaluateContextBudget('task', [{ totalTokens: 31_999, quality: 'measured' }], config).state, 'healthy');
  assert.equal(evaluateContextBudget('task', [{ totalTokens: 32_000, quality: 'measured' }], config).state, 'warning');
  assert.equal(evaluateContextBudget('task', [{ totalTokens: 64_000, quality: 'measured' }], config).state, 'critical');
  assert.equal(evaluateContextBudget('session', [{ totalTokens: 272_000, quality: 'measured' }], config).state, 'checkpoint_recommended');
});

test('missing token values produce unavailable instead of healthy', () => {
  assert.equal(evaluateContextBudget('task', [{ quality: 'unavailable' }], config).state, 'unavailable');
});

test('budget aggregates samples and reports percentage against critical threshold', () => {
  const assessment = evaluateContextBudget('task', [
    { totalTokens: 20_000, quality: 'provider_reported' },
    { totalTokens: 20_000, quality: 'estimated' },
  ], config);
  assert.equal(assessment.usedTokens, 40_000);
  assert.equal(assessment.percentUsed, 62.5);
  assert.equal(assessment.state, 'warning');
});
