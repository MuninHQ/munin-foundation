import test from 'node:test';
import assert from 'node:assert/strict';
import { EngineeringAutonomousMission, type EngineeringMissionRuntime } from '../src/engineering-autonomous-mission.js';
import type { EngineeringResult } from '../src/engineering-runtime.js';

function result(overrides: Partial<EngineeringResult> = {}): EngineeringResult {
  return {
    status: 'completed',
    objective: 'Build feature',
    branch: 'agent/example',
    commit: 'abc123',
    changedFiles: ['src/example.ts'],
    events: [],
    validation: 'npm test passed',
    delivery: 'local-commit',
    message: 'Build validated.',
    ...overrides,
  };
}

test('engineering mission runs policy build test and verify to completion', async () => {
  const runtime: EngineeringMissionRuntime = { execute: async () => result() };
  const mission = new EngineeringAutonomousMission(runtime);
  const output = await mission.run('Build a local reversible feature');

  assert.equal(output.loop.status, 'DONE');
  assert.equal(output.engineering?.commit, 'abc123');
  assert.deepEqual(output.loop.trace.map(item => item.phase), ['PLAN', 'BUILD', 'TEST', 'VERIFY']);
});

test('engineering mission blocks consequential external intent before runtime execution', async () => {
  let calls = 0;
  const runtime: EngineeringMissionRuntime = { execute: async () => { calls += 1; return result(); } };
  const mission = new EngineeringAutonomousMission(runtime);
  const output = await mission.run('Deploy to production and publish release');

  assert.equal(output.loop.status, 'BLOCKED');
  assert.equal(calls, 0);
  assert.match(output.loop.blocker ?? '', /Action Constitution needs_user/);
});

test('engineering mission propagates a genuine runtime human blocker', async () => {
  const runtime: EngineeringMissionRuntime = {
    execute: async () => result({ status: 'needs_user', message: 'Interactive authentication is required.', validation: undefined }),
  };
  const mission = new EngineeringAutonomousMission(runtime);
  const output = await mission.run('Build local feature');

  assert.equal(output.loop.status, 'BLOCKED');
  assert.equal(output.loop.iterations, 1);
  assert.match(output.loop.blocker ?? '', /Interactive authentication/);
});

test('engineering mission retries a failed build and converges after FIX', async () => {
  let calls = 0;
  const runtime: EngineeringMissionRuntime = {
    execute: async () => {
      calls += 1;
      return calls === 1
        ? result({ status: 'failed', message: 'npm test failed: flaky fixture', validation: 'npm test failed' })
        : result({ message: 'Repair converged.' });
    },
  };
  const mission = new EngineeringAutonomousMission(runtime, { maxRepeatedFailureFingerprints: 2 });
  const output = await mission.run('Fix local feature');

  assert.equal(output.loop.status, 'DONE');
  assert.equal(calls, 2);
  assert.deepEqual(output.loop.trace.map(item => item.phase), ['PLAN', 'BUILD', 'FIX', 'PLAN', 'BUILD', 'TEST', 'VERIFY']);
});

test('engineering mission stops repeated identical failures instead of looping blindly', async () => {
  let calls = 0;
  const runtime: EngineeringMissionRuntime = {
    execute: async () => {
      calls += 1;
      return result({ status: 'failed', message: 'same deterministic failure', validation: 'npm test failed' });
    },
  };
  const mission = new EngineeringAutonomousMission(runtime, { maxIterations: 5, maxRepeatedFailureFingerprints: 2 });
  const output = await mission.run('Fix local feature');

  assert.equal(output.loop.status, 'FAILED');
  assert.equal(calls, 2);
  assert.match(output.loop.blocker ?? '', /Repeated failure threshold reached/);
});

test('engineering mission fails verification when completed runtime lacks test evidence', async () => {
  const runtime: EngineeringMissionRuntime = { execute: async () => result({ validation: undefined }) };
  const mission = new EngineeringAutonomousMission(runtime, { maxRepeatedFailureFingerprints: 1 });
  const output = await mission.run('Build local feature');

  assert.equal(output.loop.status, 'FAILED');
  assert.match(output.loop.blocker ?? '', /engineering:validation-missing/);
});
