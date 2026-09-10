import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { evaluateSentinel, ApprovalQueue } from '../src/sentinel.js';
import { buildGoalEngineSnapshot } from '../src/goal-engine.js';
import { evaluateWatch } from '../src/watchers.js';
import { AgentRuntimeV1 } from '../src/agent-runtime-v1.js';
import { ActionAuditLog } from '../src/action-constitution.js';
import type { MuninState } from '../src/types.js';

const empty = (): MuninState => ({ projects: [], decisions: [], actions: [], jobs: [], research: [], goals: [], relations: [] });

test('Sentinel maps action policy into GREEN AMBER RED execution bands', () => {
  assert.equal(evaluateSentinel({ class: 'read', tool: 'read-file' }).band, 'GREEN');
  assert.equal(evaluateSentinel({ class: 'local-write', tool: 'write-draft', target: 'tmp/draft.md' }).band, 'AMBER');
  assert.equal(evaluateSentinel({ class: 'external-write', tool: 'send email' }).disposition, 'needs_approval');
  assert.equal(evaluateSentinel({ class: 'network-read', tool: 'fetch', payloadPreview: 'api_key=abcdef123456' }).disposition, 'blocked');
});

test('ApprovalQueue persists and resolves RED approvals', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-approval-'));
  try {
    const queue = new ApprovalQueue(path.join(dir, 'queue.json'));
    const decision = evaluateSentinel({ class: 'external-write', tool: 'publish linkedin', reason: 'user-facing side effect' });
    const record = await queue.enqueue(decision);
    assert.equal((await queue.list('pending')).length, 1);
    const resolved = await queue.resolve(record.id, 'approved', 'approved in test');
    assert.equal(resolved.status, 'approved');
    assert.equal((await queue.list('pending')).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Goal Engine turns durable goals into a ranked autonomy snapshot', () => {
  const state = empty();
  state.goals.push({
    id: 'career',
    title: 'Reach a strong payments role',
    priority: 'P0',
    owner: 'andre',
    status: 'active',
    successCriteria: ['qualified role identified'],
    progress: 20,
    evidence: [],
    learnings: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  });
  const snapshot = buildGoalEngineSnapshot(state, [], new Date('2026-09-10T03:00:00.000Z'));
  assert.equal(snapshot.topGoalId, 'career');
  assert.equal(snapshot.activeGoals, 1);
  assert.equal(snapshot.decision.goal?.id, 'career');
});

test('Watchers trigger on changed and threshold conditions', () => {
  const prior = { value: 79, sampledAt: '2026-09-10T00:00:00.000Z' };
  const current = { value: 87, sampledAt: '2026-09-10T01:00:00.000Z' };
  assert.equal(evaluateWatch({ id: 'fit', name: 'job fit', comparator: 'gte', target: 85 }, current, prior).triggered, true);
  assert.equal(evaluateWatch({ id: 'change', name: 'status change', comparator: 'changed' }, current, prior).triggered, true);
});

test('Agent Runtime v1 audits safe work and queues external side effects', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-runtime-'));
  try {
    const audit = new ActionAuditLog(path.join(dir, 'audit.jsonl'));
    const approvals = new ApprovalQueue(path.join(dir, 'approvals.json'));
    const runtime = new AgentRuntimeV1(audit, approvals);
    const safe = await runtime.plan(empty(), { class: 'read', tool: 'research vacancy' }, [], new Date('2026-09-10T03:00:00.000Z'));
    assert.equal(safe.sentinel.disposition, 'auto_execute');
    const risky = await runtime.plan(empty(), { class: 'external-write', tool: 'send email', target: 'recruiter' }, [], new Date('2026-09-10T03:01:00.000Z'));
    assert.equal(risky.sentinel.disposition, 'needs_approval');
    assert.ok(risky.approvalId);
    assert.equal((await approvals.list('pending')).length, 1);
    assert.equal((await audit.replay()).length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
