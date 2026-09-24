import test from 'node:test';
import assert from 'node:assert/strict';
import { benchmarkCapabilityCandidate } from '../src/capability-promotion-benchmark.js';
import { loadTokenEfficiencyConfig } from '../src/token-efficiency-config.js';
import { observePromotionEfficiency } from '../src/token-efficiency-promotion-observer.js';

const candidate = { id: 'x', name: 'example/tool', source: 'https://github.com/example/tool', license: 'MIT', recurringCost: 0, metered: false, paidApiRequired: false, maintenanceScore: 1, securityScore: .9, duplicationScore: .1, evidence: ['license', 'maintenance', 'security', 'rollback'] };

test('promotion observation is advisory and benchmark decisions remain identical', () => {
  const observations: unknown[] = [];
  const baseline = benchmarkCapabilityCandidate(candidate);
  const enabled = benchmarkCapabilityCandidate(candidate, { observe: event => observations.push(event) });
  assert.deepEqual(enabled, baseline);
  assert.equal(observations.length, 1);
  assert.equal((observations[0] as { recommendedTier: string }).recommendedTier, 'local_model');
});

test('disabled promotion observation emits nothing', () => {
  const result = observePromotionEfficiency(candidate, benchmarkCapabilityCandidate(candidate), loadTokenEfficiencyConfig({}));
  assert.equal(result, undefined);
});

test('observer callback failure cannot change the promotion result', () => {
  const baseline = benchmarkCapabilityCandidate(candidate);
  const observed = benchmarkCapabilityCandidate(candidate, { observe: () => { throw new Error('observer failed'); } });
  assert.deepEqual(observed, baseline);
});
