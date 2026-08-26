import test from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveExecutionEngine, InMemoryOutcomeStore } from '../src/adaptive-execution.js';

test('adaptive execution enforces spec convergence for build work', async () => {
  const engine = new AdaptiveExecutionEngine(new InMemoryOutcomeStore());
  const result = await engine.execute({
    id: 'build-1',
    objective: 'Implement guarded capability',
    capability: 'build',
    kind: 'build',
    context: {
      constraints: ['zero-cost', 'provider-neutral'],
      relevantFiles: ['src/example.ts'],
      specContract: {
        objective: 'Implement guarded capability',
        requirements: [{ id: 'REQ-1', text: 'Capability is guarded', acceptanceCriteria: ['test evidence'] }],
      },
      requirementEvidence: [{ requirementId: 'REQ-1', evidence: ['test:guarded-pass'] }],
      implementationTags: ['REQ-1'],
    },
  }, async () => ({ evidence: ['test:guarded-pass'] }), async () => ({ passed: true, checks: [{ name: 'reviewer', passed: true }] }));

  assert.equal(result.validation.passed, true);
  assert.equal(result.validation.checks.some(check => check.name === 'spec-convergence' && check.passed), true);
});

test('adaptive execution refuses promotion when a spec requirement lacks evidence', async () => {
  const engine = new AdaptiveExecutionEngine(new InMemoryOutcomeStore());
  await assert.rejects(() => engine.execute({
    id: 'build-2',
    objective: 'Implement complete capability',
    capability: 'build',
    kind: 'build',
    context: {
      specContract: {
        objective: 'Implement complete capability',
        requirements: [
          { id: 'REQ-1', text: 'Core behavior', acceptanceCriteria: ['core test'] },
          { id: 'REQ-2', text: 'Safety behavior', acceptanceCriteria: ['safety test'] },
        ],
      },
      requirementEvidence: [{ requirementId: 'REQ-1', evidence: ['core-test-pass'] }],
      implementationTags: ['REQ-1', 'REQ-2'],
    },
  }, async () => ({ evidence: ['core-test-pass'] }), async () => ({ passed: true, checks: [{ name: 'reviewer', passed: true }] })), /spec-convergence/);
});
