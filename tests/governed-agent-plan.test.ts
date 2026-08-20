import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGovernedAgentPlan, GOVERNANCE_AGENT_REGISTRY } from '../src/governed-agent-plan.js';

test('governed engineering plan adds Chief Developer specialists without changing legacy plan', () => {
  const plan = buildGovernedAgentPlan('engineering');
  for (const id of ['chief-developer','architect','security-reviewer','cost-guardian','blocker-resolver']) assert.ok(plan.includes(id));
  assert.match(GOVERNANCE_AGENT_REGISTRY['cost-guardian'].mission, /zero-additional-cost/i);
});
