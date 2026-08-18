import test from 'node:test';
import assert from 'node:assert/strict';
import { registerIndependentReviewCapability } from '../src/independent-review-capability.js';
import { RuntimeCapabilityRegistry } from '../src/runtime-capability-seam.js';

test('independent reviewer validates required input', async () => {
  const registry = new RuntimeCapabilityRegistry();
  registerIndependentReviewCapability(registry);
  await assert.rejects(registry.execute('engineering.independent-review', { objective: '', implementationSummary: 'x' }), /objective is required/);
  await assert.rejects(registry.execute('engineering.independent-review', { objective: 'x', implementationSummary: '' }), /summary is required/);
});

test('independent reviewer provides local review notes without external provider', async () => {
  const registry = new RuntimeCapabilityRegistry();
  registerIndependentReviewCapability(registry);
  const result = await registry.execute<any, any>('engineering.independent-review', {
    objective: 'Ship feature safely',
    implementationSummary: 'Implemented feature',
  });
  assert.equal(result.output.independent, true);
  assert.equal(result.output.reviewer, 'local-independent-gate');
  assert.equal(result.output.verdict, 'approve_with_notes');
  assert.ok(result.output.findings.some((item: any) => item.area === 'tests'));
});

test('independent reviewer approves complete local evidence', async () => {
  const registry = new RuntimeCapabilityRegistry();
  registerIndependentReviewCapability(registry);
  const result = await registry.execute<any, any>('engineering.independent-review', {
    objective: 'Ship feature safely',
    implementationSummary: 'Implemented feature',
    changedFiles: ['src/a.ts'],
    tests: ['npm test passed'],
    acceptanceCriteria: ['works'],
  });
  assert.equal(result.output.verdict, 'approve');
  assert.equal(result.output.findings.length, 0);
});
