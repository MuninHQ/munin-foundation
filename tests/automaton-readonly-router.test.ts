import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomatonReadOnlyRouter, automatonReadOnlyEligibility, type AutomatonBridgeTransport } from '../src/automaton-readonly-router.js';

function transport(overrides: Partial<AutomatonBridgeTransport> = {}): AutomatonBridgeTransport {
  return {
    async health() {
      return { ready: true, state: { runtime: { running: true }, agent: { localOnly: true }, counts: { queued: 0 }, goals: [] } };
    },
    async submit() { return { ready: true, taskId: 'task-1' }; },
    async status() { return { ready: true, status: 'completed', goalId: 'goal-1', result: { output: 'verified local result' } }; },
    async cancel() { return { ready: true, status: 'cancelled' }; },
    ...overrides,
  };
}

test('eligibility accepts bounded read-only analysis and blocks mutation/external intent', () => {
  assert.equal(automatonReadOnlyEligibility({ objective: 'Inspect repository logs and summarize failures', capability: 'research', risk: 'low' }).eligible, true);
  assert.equal(automatonReadOnlyEligibility({ objective: 'Delete obsolete files', capability: 'research', risk: 'low' }).eligible, false);
  assert.equal(automatonReadOnlyEligibility({ objective: 'Search the web for competitors', capability: 'research', risk: 'low' }).eligible, false);
  assert.equal(automatonReadOnlyEligibility({ objective: 'Inspect code', capability: 'execute', risk: 'low', context: { readOnly: true } }).eligible, true);
});

test('router uses Automaton when idle and returns local provider response', async () => {
  const router = new AutomatonReadOnlyRouter({ enabled: true, transport: transport(), slaMs: 100, pollMs: 5 });
  const result = await router.tryRoute({ objective: 'Inspect logs and summarize failures', capability: 'research', risk: 'low' });
  assert.equal(result.used, true);
  assert.equal(result.attempted, true);
  assert.equal(result.response?.providerId, 'automaton-local');
  assert.equal(result.response?.output, 'verified local result');
});

test('router does not submit when Automaton is already busy', async () => {
  let submitted = false;
  const router = new AutomatonReadOnlyRouter({
    enabled: true,
    transport: transport({
      async health() {
        return { ready: true, state: { runtime: { running: true }, agent: { localOnly: true }, counts: { queued: 0 }, goals: [{ status: 'active' }] } };
      },
      async submit() { submitted = true; return { ready: true, taskId: 'unexpected' }; },
    }),
  });
  const result = await router.tryRoute({ objective: 'Inspect logs', capability: 'research', risk: 'low' });
  assert.equal(result.used, false);
  assert.equal(result.attempted, false);
  assert.equal(result.reason, 'Automaton is busy');
  assert.equal(submitted, false);
});

test('router cancels accepted task when SLA expires so normal provider can take over', async () => {
  let cancelled = 0;
  const router = new AutomatonReadOnlyRouter({
    enabled: true,
    slaMs: 20,
    pollMs: 5,
    transport: transport({
      async status() { return { ready: true, status: 'active' }; },
      async cancel(taskId: string) { cancelled += 1; return { ready: true, taskId, status: 'cancelled' }; },
    }),
  });
  const result = await router.tryRoute({ objective: 'Analyze local test output', capability: 'research', risk: 'low' });
  assert.equal(result.used, false);
  assert.equal(result.attempted, true);
  assert.equal(result.cancelled, true);
  assert.equal(cancelled, 1);
  assert.match(result.reason, /SLA exceeded/);
});

test('router stays inert when automatic routing is disabled', async () => {
  let healthChecks = 0;
  const router = new AutomatonReadOnlyRouter({
    enabled: false,
    transport: transport({ async health() { healthChecks += 1; return {}; } }),
  });
  const result = await router.tryRoute({ objective: 'Inspect logs', capability: 'research', risk: 'low' });
  assert.equal(result.attempted, false);
  assert.equal(healthChecks, 0);
});
