import test from 'node:test';
import assert from 'node:assert/strict';
import { IntelligenceOrchestrationPlanner } from '../src/intelligence-orchestration.js';

const planner = new IntelligenceOrchestrationPlanner();

test('high-risk work is routed to Council in auto mode', () => {
  const plan = planner.plan({ objective: 'Choose a migration strategy', capability: 'execute', risk: 'high' });
  assert.equal(plan.route, 'council');
  assert.equal(plan.localOnly, true);
  assert.equal(plan.maxCostPerCall, 0);
});

test('strategy work is routed to Council by default', () => {
  const plan = planner.plan({ objective: 'Prioritize the roadmap', capability: 'strategy' });
  assert.equal(plan.route, 'council');
  assert.deepEqual(plan.providerPreference, ['ollama-local', 'deterministic-local']);
});

test('simple work stays direct and explicit mode wins', () => {
  assert.equal(planner.plan({ objective: 'Summarize state', capability: 'research', risk: 'low' }).route, 'direct');
  assert.equal(planner.plan({ objective: 'Force a single pass', capability: 'strategy', mode: 'direct', risk: 'high' }).route, 'direct');
});
