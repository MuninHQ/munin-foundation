import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MuninControlRoomOrchestrator } from '../src/control-room-orchestrator.js';

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-control-room-'));
  await mkdir(path.join(root, 'ops'), { recursive: true });
  await writeFile(path.join(root, 'ops/CURRENT_STATE.md'), '# State\n', 'utf8');
  await writeFile(path.join(root, 'ops/BACKLOG.md'), '# Backlog\n', 'utf8');
  await writeFile(path.join(root, 'ops/SESSION_LOG.md'), '# Sessions\n', 'utf8');
  return root;
}

test('control room hydrates canonical state and completes safe product work', async () => {
  const root = await fixture();
  const result = await new MuninControlRoomOrchestrator(root).execute({
    objective: 'Atualizar backlog e prioridade do produto',
  });

  assert.equal(result.status, 'done');
  assert.equal(result.workType, 'product');
  assert.deepEqual(result.plan, ['product-state-manager', 'memory-curator']);
  assert.equal(result.trace[0]?.agentId, 'product-state-manager');
  assert.equal(result.trace.at(-1)?.agentId, 'memory-curator');

  const session = await readFile(path.join(root, 'ops/SESSION_LOG.md'), 'utf8');
  assert.match(session, /Multi-agent orchestration completed durable work/);
  assert.match(session, /Atualizar backlog e prioridade do produto/);
  const receipts = await readFile(path.join(root, 'data/runtime/telemetry/execution-receipts.jsonl'), 'utf8');
  const receipt = JSON.parse(receipts.trim());
  assert.equal(receipt.runId, result.runId);
  assert.equal(receipt.status, 'done');
});

test('control room rejects empty objectives before executing agents', async () => {
  const root = await fixture();
  await assert.rejects(
    () => new MuninControlRoomOrchestrator(root).execute({ objective: '   ' }),
    /Objective is required/,
  );
});
