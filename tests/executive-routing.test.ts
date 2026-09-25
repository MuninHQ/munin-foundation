import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutiveCheckpointStore } from '../src/executive-checkpoint.js';
import { premiumBudgetFromEnv, routeModel } from '../src/model-router.js';

const demanding = { impact: 9, complexity: 9, toolUse: 9, autonomy: 9, risk: 4 };

test('premium route fails closed when credit telemetry is unknown', () => {
  const budget = premiumBudgetFromEnv({} as NodeJS.ProcessEnv);
  const route = routeModel(demanding, budget, true);
  assert.equal(route.tier, 'economy');
  assert.equal(route.premiumAllowed, false);
  assert.equal(route.budget.available, 'unknown');
});

test('premium route requires workload justification, explicit budget and provider configuration', () => {
  const budget = { available: true, source: 'manual' as const };
  assert.equal(routeModel(demanding, budget, false).tier, 'economy');
  assert.equal(routeModel(demanding, budget, true).tier, 'premium');
  assert.equal(routeModel({ impact: 4, complexity: 4, toolUse: 3, autonomy: 3 }, budget, true).tier, 'economy');
});

test('executive checkpoint persists lifecycle progress and can be resumed', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-executive-test-'));
  try {
    const store = new ExecutiveCheckpointStore(root);
    await store.advance('BUILD ALL test objective', 'UNDERSTAND');
    await store.advance('BUILD ALL test objective', 'CHALLENGE');
    const loaded = await store.load('BUILD ALL test objective');
    assert.deepEqual(loaded?.completed, ['UNDERSTAND', 'CHALLENGE']);
    assert.equal((await store.list())[0]?.objective, 'BUILD ALL test objective');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
