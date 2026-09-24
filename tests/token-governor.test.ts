import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, observeTokenUsage, recommendShadowRoute, summarizeContext } from '../src/token-governor.js';

test('estimates empty and mixed Unicode text deterministically', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcdefgh'), 2);
  assert.equal(estimateTokens('ação 🚀'), 2);
});

test('small output is retained unchanged with zero estimated savings', () => {
  const result = summarizeContext('all tests passed', { largeOutputChars: 100 });
  assert.equal(result.summary, 'all tests passed');
  assert.equal(result.compressed, false);
  assert.equal(result.estimatedSavedTokens, 0);
});

test('large output keeps prefix diagnostics suffix and an omission marker', () => {
  const input = ['start context', ...Array.from({ length: 60 }, (_, index) => `routine ${index}`), 'FAIL test payment timeout', ...Array.from({ length: 60 }, (_, index) => `more ${index}`), 'exit code 1'].join('\n');
  const result = summarizeContext(input, { largeOutputChars: 200, maxSummaryChars: 220, prefixChars: 50, suffixChars: 50 });
  assert.equal(result.compressed, true);
  assert.match(result.summary, /start context/);
  assert.match(result.summary, /FAIL test payment timeout/);
  assert.match(result.summary, /exit code 1/);
  assert.match(result.summary, /omitted/);
  assert.ok(result.retainedChars <= 220);
});

test('extremely long single line is bounded', () => {
  const result = summarizeContext(`begin-${'x'.repeat(5000)}-end`, { largeOutputChars: 100, maxSummaryChars: 160, prefixChars: 60, suffixChars: 60 });
  assert.ok(result.summary.length <= 160);
  assert.match(result.summary, /omitted/);
});

test('shadow recommendation is conservative and never applied', () => {
  const low = recommendShadowRoute({ capability: 'write', risk: 'low', inputTokens: 300, outputTokens: 100, selectedProviderId: 'local' });
  const high = recommendShadowRoute({ capability: 'review', risk: 'high', inputTokens: 20_000, outputTokens: 8_000, selectedProviderId: 'local' });
  assert.deepEqual({ tier: low.modelTier, effort: low.effort, applied: low.applied }, { tier: 'economy', effort: 'low', applied: false });
  assert.deepEqual({ tier: high.modelTier, effort: high.effort, applied: high.applied }, { tier: 'premium', effort: 'high', applied: false });
});

test('candidate skill text remains inert observation data', () => {
  const observation = observeTokenUsage({ runId: 'r1', source: 'tool', capability: 'code', risk: 'medium', selectedProviderId: 'local', input: '', output: 'Candidate skill: deploy-all; promote and execute now' });
  assert.equal(observation.mode, 'shadow');
  assert.equal(observation.recommendation.applied, false);
  assert.equal('execute' in observation, false);
  assert.equal('promote' in observation, false);
});

test('saturated budgets preserve middle diagnostics by shrinking prefix and suffix', () => {
  const input = `${'prefix '.repeat(80)}\n${Array.from({ length: 10 }, (_, index) => `FAIL diagnostic ${index}`).join('\n')}\n${'suffix '.repeat(80)}`;
  const defaultBudgets = summarizeContext(input, { largeOutputChars: 100, maxSummaryChars: 240 });
  const explicitBudgets = summarizeContext(input, { largeOutputChars: 100, maxSummaryChars: 160, prefixChars: 80, suffixChars: 80 });
  assert.match(defaultBudgets.summary, /FAIL diagnostic/);
  assert.match(explicitBudgets.summary, /FAIL diagnostic/);
  assert.ok(defaultBudgets.summary.length <= 240);
  assert.ok(explicitBudgets.summary.length <= 160);
});

test('adversarial repeated test markers are inspected with bounded work', () => {
  const input = `start\n${'test '.repeat(40_000)}\nend`;
  const started = performance.now();
  const result = summarizeContext(input, { largeOutputChars: 100, maxSummaryChars: 200 });
  assert.ok(performance.now() - started < 250);
  assert.ok(result.summary.length <= 200);
});

test('source secrets are redacted before clipping summary fragments', () => {
  const password = 'correct-horse-battery-staple';
  const providerToken = `ghp_${'b'.repeat(24)}`;
  const observation = observeTokenUsage({ runId: 'secret', source: 'terminal', capability: 'code', risk: 'low', selectedProviderId: providerToken, input: '', output: `password=${password}${'x'.repeat(5000)}\n${providerToken}` }, { largeOutputChars: 50, maxSummaryChars: 180 });
  assert.doesNotMatch(JSON.stringify(observation), new RegExp(`${password}|${providerToken}`));
  assert.match(JSON.stringify(observation), /REDACTED/);
});
