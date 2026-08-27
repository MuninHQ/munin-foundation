import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityBudgetGuard, executeWithTripwiresAndBudget } from '../src/capability-budget.js';

test('capability budget tracks and blocks writes beyond configured blast radius', () => {
  const guard = new CapabilityBudgetGuard({ maxWrites: 1, maxDistinctTargets: 1 });
  const first = guard.consume({ kind: 'write', target: 'src/a.ts' });
  assert.equal(first.allow, true);
  assert.equal(guard.usage.writes, 1);

  const second = guard.consume({ kind: 'write', target: 'src/b.ts' });
  assert.equal(second.allow, false);
  assert.match(second.reasons.join(' '), /write budget exceeded/);
  assert.match(second.reasons.join(' '), /blast radius exceeded/);
  assert.equal(guard.usage.writes, 1);
});

test('capability budget restricts external calls to an allowlist', () => {
  const guard = new CapabilityBudgetGuard({ maxExternalCalls: 2, allowedDomains: ['api.github.com'] });
  const allowed = guard.consume({ kind: 'external', domain: 'api.github.com' });
  assert.equal(allowed.allow, true);

  const blocked = guard.consume({ kind: 'external', domain: 'example.com' });
  assert.equal(blocked.allow, false);
  assert.match(blocked.reasons.join(' '), /outside capability budget/);
  assert.equal(guard.usage.externalCalls, 1);
});

test('capability budget enforces aggregate zero-cost policy', () => {
  const guard = new CapabilityBudgetGuard({ maxCostUsd: 0 });
  const decision = guard.consume({ kind: 'external', domain: 'local', costUsd: 0.01 });
  assert.equal(decision.allow, false);
  assert.match(decision.reasons.join(' '), /cost budget exceeded/);
  assert.equal(guard.usage.costUsd, 0);
});

test('tripwire plus budget commits usage only after a successful guarded execution', async () => {
  const guard = new CapabilityBudgetGuard({ maxToolCalls: 1, maxWrites: 1 });
  const result = await executeWithTripwiresAndBudget(
    { tool: 'write-file', risk: 'write', costUsd: 0 },
    { kind: 'write', target: 'src/safe.ts' },
    guard,
    async () => ({ output: 'ok', evidence: ['file-written'] }),
  );

  assert.equal(result.output, 'ok');
  assert.equal(guard.usage.toolCalls, 1);
  assert.equal(guard.usage.writes, 1);
});

test('tripwire rejection does not consume blast-radius budget', async () => {
  const guard = new CapabilityBudgetGuard({ maxToolCalls: 1 });
  await assert.rejects(
    executeWithTripwiresAndBudget(
      { tool: 'publish', risk: 'consequential' },
      { kind: 'external', domain: 'linkedin.com' },
      guard,
      async () => ({ evidence: ['should-not-run'] }),
    ),
    /Tool preflight blocked/,
  );
  assert.equal(guard.usage.toolCalls, 0);
});
