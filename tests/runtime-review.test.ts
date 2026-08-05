import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ExecutionEngine } from '../src/runtime.js';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';
import { reviewOutput } from '../src/review.js';

class PassingProvider implements ExecutionProvider {
  readonly id = 'passing-test';
  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    return {
      providerId: this.id,
      output: `Completed ${request.expectedOutput} for ${request.title}`,
      metadata: { test: true },
    };
  }
}

class FailingProvider implements ExecutionProvider {
  readonly id = 'failing-test';
  async execute(): Promise<ProviderResponse> {
    return { providerId: this.id, output: 'x', metadata: { test: true } };
  }
}

test('provider boundary records provenance and accepted reviews', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-runtime-'));
  try {
    const engine = new ExecutionEngine(dir, new PassingProvider());
    const plan = await engine.createPlan('Build code for provider boundary');
    const completed = await engine.run(plan.id);
    assert.equal(completed.status, 'DONE');
    assert.ok(completed.tasks.every(task => task.providerId === 'passing-test'));
    assert.ok(completed.tasks.every(task => task.review?.accepted));
    const telemetry = await engine.telemetry();
    assert.equal(telemetry.averageReviewScore, 100);
    assert.equal(telemetry.byProvider['passing-test'], 3);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('quality gate rejects weak provider output and blocks dependents', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-runtime-'));
  try {
    const engine = new ExecutionEngine(dir, new FailingProvider());
    const plan = await engine.createPlan('Build code for quality gate');
    const completed = await engine.run(plan.id);
    assert.equal(completed.status, 'FAILED');
    assert.equal(completed.tasks[0].status, 'FAILED');
    assert.equal(completed.tasks[1].status, 'BLOCKED');
    assert.equal(completed.tasks[0].review?.accepted, false);
    const telemetry = await engine.telemetry();
    assert.equal(telemetry.rejectedByQualityGate, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review output is deterministic and explainable', () => {
  const report = reviewOutput('Evidence set', 'Research evidence: Evidence set');
  assert.equal(report.score, 100);
  assert.equal(report.accepted, true);
  assert.deepEqual(report.criteria.map(item => item.id), ['non-empty', 'minimum-detail', 'expected-output-alignment']);
});
