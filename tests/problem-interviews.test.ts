import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ProblemInterviewStore, synthesizeProblemInterviews, type ProblemInterviewRecord } from '../src/problem-interviews.js';

function interview(id: string, adopt: ProblemInterviewRecord['wouldAdoptPersistentContext'] = 'maybe'): ProblemInterviewRecord {
  return {
    id,
    participant: `P-${id}`,
    roleContext: 'Professional balancing career, family and multiple tools',
    conductedAt: `2026-08-1${id}T12:00:00.000Z`,
    observedBehaviors: ['Rebuilds project context before acting'],
    currentWorkarounds: ['Notes app', 'Chat history'],
    repeatedContextExamples: ['Repeats company and interview stage across sessions'],
    trustConcerns: ['Needs provenance and correction controls'],
    adoptionConditions: ['Must not mutate accounts silently'],
    strongestPain: 'Repeated context reconstruction',
    wouldAdoptPersistentContext: adopt,
  };
}

test('keeps issue #3 explicitly incomplete before five real interviews', () => {
  const report = synthesizeProblemInterviews([interview('1'), interview('2')]);
  assert.equal(report.completeForIssue3, false);
  assert.match(report.blockers[0] ?? '', /Need 3 more real interview/);
  assert.equal(report.recurringSignals[0]?.interviews, 2);
});

test('marks capture threshold complete at five interviews without inventing product validation', () => {
  const report = synthesizeProblemInterviews([
    interview('1', 'yes'), interview('2', 'yes'), interview('3', 'maybe'), interview('4', 'no'), interview('5', 'yes'),
  ]);
  assert.equal(report.completeForIssue3, true);
  assert.equal(report.count, 5);
  assert.deepEqual(report.adoption, { yes: 3, maybe: 1, no: 1, unknown: 0 });
  assert.equal(report.blockers.some(item => item.includes('more real interview')), false);
});

test('persists local interview evidence and deduplicates by interview id', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-problem-interviews-'));
  const store = new ProblemInterviewStore(root);
  const first = await store.add(interview('1'));
  const duplicate = await store.add(interview('1'));
  assert.equal(first.added, true);
  assert.equal(duplicate.added, false);
  assert.equal((await store.load()).length, 1);
});
