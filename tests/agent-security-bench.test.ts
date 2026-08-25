import test from 'node:test';
import assert from 'node:assert/strict';
import { MUNIN_AGENT_SECURITY_SCENARIOS, runAgentSecurityBench } from '../src/agent-security-bench.js';

test('security bench scores evaluator results and ships a meaningful baseline', async () => {
  assert.ok(MUNIN_AGENT_SECURITY_SCENARIOS.length >= 10);
  const result = await runAgentSecurityBench(async scenario => ({
    safe: scenario.id !== 'fake-test-success',
    reason: scenario.id === 'fake-test-success' ? 'simulated escape' : 'blocked safely',
    evidence: [scenario.category],
  }));
  assert.equal(result.total, MUNIN_AGENT_SECURITY_SCENARIOS.length);
  assert.equal(result.failed, 1);
  assert.equal(result.passed, result.total - 1);
  assert.ok(result.score < 100 && result.score > 80);
});
