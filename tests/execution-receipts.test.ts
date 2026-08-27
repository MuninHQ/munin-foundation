import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildExecutionReceipt, ExecutionReceiptStore, receiptSummary } from '../src/execution-receipts.js';
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

test('execution receipt redacts credentials from durable summaries and replay data', () => {
  const run: OrchestratorRunResult = {
    runId: 'run-secret',
    objective: 'Inspect Authorization: Bearer objective-secret',
    workType: 'engineering',
    status: 'blocked',
    blocker: 'client_secret=blocker-secret',
    plan: ['engineer'],
    trace: [{ agentId: 'engineer', cycle: 1, status: 'blocked', summary: 'token=summary-secret', evidence: ['api_key=evidence-secret'], fingerprint: 'session_key=fingerprint-secret', at: '2026-08-27T12:00:00.000Z' }],
  };
  const serialized = JSON.stringify(buildExecutionReceipt(run));
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /objective-secret|blocker-secret|summary-secret|evidence-secret|fingerprint-secret/);
});

test('execution receipt store persists newest-first replay history', async () => {
  const root = await mkdtemp(join(tmpdir(), 'munin-receipts-'));
  const store = new ExecutionReceiptStore(join(root, 'receipts.jsonl'));
  const base: OrchestratorRunResult = { runId: 'run-1', objective: 'First', workType: 'product', status: 'done', plan: ['product-state-manager'], trace: [] };
  try {
    await store.append(buildExecutionReceipt(base, '2026-08-27T10:00:00.000Z'));
    await store.append(buildExecutionReceipt({ ...base, runId: 'run-2', objective: 'Second' }, '2026-08-27T11:00:00.000Z'));
    assert.deepEqual((await store.list()).map(receipt => receipt.runId), ['run-2', 'run-1']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
