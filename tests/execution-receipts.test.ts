import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutionReceipt, receiptSummary } from '../src/execution-receipts.js';
import type { OrchestratorRunResult } from '../src/agent-orchestrator.js';

test('execution receipt preserves evidence and replay fingerprints', () => {
  const run: OrchestratorRunResult = {
    runId: 'run-1',
    objective: 'Build safe feature',
    workType: 'engineering',
    status: 'done',
    plan: ['product-state-manager', 'engineer', 'qa-verifier', 'memory-curator', 'operator'],
    trace: [
      { agentId: 'engineer', cycle: 1, status: 'completed', summary: 'implemented', evidence: ['diff:abc'], fingerprint: 'eng-1', at: '2026-08-25T12:00:00.000Z' },
      { agentId: 'qa-verifier', cycle: 2, status: 'completed', summary: 'verified', evidence: ['tests:507'], fingerprint: 'qa-1', at: '2026-08-25T12:01:00.000Z' },
    ],
  };
  const receipt = buildExecutionReceipt(run, '2026-08-25T12:02:00.000Z');
  assert.deepEqual(receipt.replay.priorFingerprints, ['eng-1', 'qa-1']);
  assert.equal(receiptSummary(receipt).evidenceCount, 2);
  assert.equal(receiptSummary(receipt).failedSteps, 0);
});
