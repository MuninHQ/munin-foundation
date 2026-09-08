import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveLifecycleState,
  isValidTopicKey,
  memoryFingerprint,
  normalizeTopicKey,
  observeMemory,
  runMemoryDoctor,
} from '../src/memory-observation.js';
import { planProgressiveRecall } from '../src/memory-progressive-recall.js';

test('normalizes and validates canonical two-level topic keys', () => {
  assert.equal(normalizeTopicKey(' Architecture/Auth-Model '), 'architecture/auth-model');
  assert.equal(isValidTopicKey('architecture/auth-model'), true);
  assert.equal(isValidTopicKey('architecture/auth/model'), false);
  assert.equal(isValidTopicKey('auth-model'), false);
});

test('fingerprint is stable across whitespace and casing noise', () => {
  const a = memoryFingerprint({
    project: 'Munin',
    scope: 'project',
    type: 'decision',
    title: 'Provider Policy',
    content: 'Use   local-first providers',
  });
  const b = memoryFingerprint({
    project: ' munin ',
    scope: 'PROJECT',
    type: 'Decision',
    title: 'provider policy',
    content: 'use local-first providers',
  });
  assert.equal(a, b);
});

test('lifecycle marks stale memories for advisory review', () => {
  const now = new Date('2026-09-08T12:00:00.000Z');
  const state = deriveLifecycleState('2026-05-01T12:00:00.000Z', 90, now);
  assert.equal(state.lifecycleState, 'needs_review');
  assert.ok(state.reviewAfter);
});

test('observer keeps missing topic keys valid and additive', () => {
  const result = observeMemory({ title: 'one-off bug', content: 'fixed' });
  assert.equal(result.topicKeyValid, true);
  assert.equal(result.normalizedTopicKey, undefined);
  assert.ok(result.fingerprint.length > 10);
});

test('doctor reports duplicates, topic revisions, invalid keys, stale and oversized records', () => {
  const now = new Date('2026-09-08T12:00:00.000Z');
  const records = [
    {
      id: 'a',
      project: 'munin',
      scope: 'project',
      type: 'decision',
      title: 'Provider policy',
      content: 'local first',
      topicKey: 'decision/provider-policy',
      updatedAt: '2026-05-01T12:00:00.000Z',
      reviewAfterDays: 90,
    },
    {
      id: 'b',
      project: 'munin',
      scope: 'project',
      type: 'decision',
      title: 'Provider policy',
      content: 'local first',
      topicKey: 'decision/provider-policy',
      updatedAt: '2026-09-01T12:00:00.000Z',
    },
    {
      id: 'c',
      project: 'munin',
      scope: 'project',
      type: 'note',
      title: 'Bad key',
      content: 'x'.repeat(21),
      topicKey: 'bad/key/shape',
    },
  ];

  const report = runMemoryDoctor(records, { now, oversizedChars: 20 });
  assert.equal(report.total, 3);
  assert.equal(report.duplicateGroups.length, 1);
  assert.equal(report.duplicateGroups[0].count, 2);
  assert.equal(report.topicRevisionGroups.length, 1);
  assert.equal(report.topicRevisionGroups[0].revisionCount, 2);
  assert.deepEqual(report.invalidTopicKeys.map((item) => item.id), ['c']);
  assert.deepEqual(report.needsReview.map((item) => item.id), ['a']);
  assert.deepEqual(report.oversized.map((item) => item.id), ['c']);
  assert.equal(report.potentialConflicts.length, 0);
  assert.equal(report.missingScope.length, 0);
});

test('progressive recall expands only top-ranked candidates', () => {
  const plan = planProgressiveRecall(
    [
      { id: 'low', score: 0.2, preview: 'low' },
      { id: 'high', score: 0.9, preview: 'high' },
      { id: 'mid', score: 0.6, preview: 'mid' },
    ],
    { compactLimit: 3, timelineLimit: 2, fullLimit: 1 },
  );

  assert.deepEqual(plan.compact.map((item) => item.id), ['high', 'mid', 'low']);
  assert.deepEqual(plan.timelineIds, ['high', 'mid']);
  assert.deepEqual(plan.fullMemoryIds, ['high']);
});


test('doctor surfaces potential topic conflicts without mutating records', () => {
  const report = runMemoryDoctor([
    { id: 'v1', scope: 'project', type: 'decision', title: 'Provider', content: 'use ollama', topicKey: 'decision/provider' },
    { id: 'v2', scope: 'project', type: 'decision', title: 'Provider', content: 'use deterministic local', topicKey: 'decision/provider' },
    { id: 'orphan', type: 'note', title: 'Missing scope', content: 'x' },
  ]);
  assert.deepEqual(report.potentialConflicts.map(item => item.topicKey), ['decision/provider']);
  assert.deepEqual(report.missingScope.map(item => item.id), ['orphan']);
});
