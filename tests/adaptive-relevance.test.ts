import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rankRelevantOutcomes,
  validateOutcomeFeedback,
} from '../src/adaptive-relevance.js';
import type { AdaptiveTask, OutcomeRecord } from '../src/adaptive-execution.js';

const now = new Date('2026-09-02T00:00:00.000Z');
const task: AdaptiveTask = { id: 'task-1', capability: 'provider', objective: 'Build provider adapter' };

function outcome(id: string, createdAt: string, overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    id,
    taskId: `task-${id}`,
    objective: 'Build provider adapter',
    capability: 'provider',
    route: { primary: 'builder', reviewers: ['reviewer'], rationale: [] },
    status: 'passed',
    evidence: [],
    lesson: 'Provider adapter lesson',
    tags: ['provider'],
    createdAt,
    ...overrides,
  };
}

function withFeedback(record: OutcomeRecord, rating: 'helpful' | 'neutral' | 'harmful'): OutcomeRecord {
  return { ...record, feedback: { rating, createdAt: now.toISOString() } } as OutcomeRecord;
}

test('ranks identical lexical matches by the 30-day half-life', () => {
  const recent = outcome('recent', '2026-09-02T00:00:00.000Z');
  const old = outcome('old', '2026-08-03T00:00:00.000Z');

  const ranked = rankRelevantOutcomes([recent, old], task, now);

  assert.equal(ranked[0].id, recent.id);
  assert.equal(ranked.find(item => item.id === old.id)?.relevance.timeWeight, 0.5);
});

test('clamps future creation timestamps to age zero', () => {
  const future = rankRelevantOutcomes([outcome('future', '2026-09-03T00:00:00.000Z')], task, now)[0];

  assert.equal(future.relevance.ageDays, 0);
  assert.equal(future.relevance.timeWeight, 1);
});

test('excludes records with invalid creation timestamps', () => {
  const ranked = rankRelevantOutcomes([
    outcome('invalid', 'not-a-timestamp'),
    outcome('valid', '2026-09-02T00:00:00.000Z'),
  ], task, now);

  assert.deepEqual(ranked.map(item => item.id), ['valid']);
});

test('applies bounded feedback multipliers', () => {
  const ranked = rankRelevantOutcomes([
    withFeedback(outcome('helpful', now.toISOString()), 'helpful'),
    withFeedback(outcome('neutral', now.toISOString()), 'neutral'),
    outcome('absent', now.toISOString()),
    withFeedback(outcome('harmful', now.toISOString()), 'harmful'),
  ], task, now);

  assert.equal(ranked.find(item => item.id === 'helpful')?.relevance.feedbackMultiplier, 1.25);
  assert.equal(ranked.find(item => item.id === 'neutral')?.relevance.feedbackMultiplier, 1);
  assert.equal(ranked.find(item => item.id === 'absent')?.relevance.feedbackMultiplier, 1);
  assert.equal(ranked.find(item => item.id === 'harmful')?.relevance.feedbackMultiplier, 0.25);
});

test('orders by descending weighted score', () => {
  const ranked = rankRelevantOutcomes([
    outcome('lower-score', now.toISOString(), { objective: 'Unrelated work', capability: 'provider', tags: [], lesson: '' }),
    outcome('higher-score', now.toISOString()),
  ], task, now);

  assert.deepEqual(ranked.map(item => item.id), ['higher-score', 'lower-score']);
});

test('orders equal weighted scores by descending valid creation time', () => {
  const ranked = rankRelevantOutcomes([
    outcome('older-full-match', '2026-08-03T00:00:00.000Z'),
    outcome('newer-partial-match', now.toISOString(), { objective: 'Unrelated work', capability: 'provider', tags: [], lesson: '' }),
  ], task, now);

  assert.equal(ranked[0].relevance.weightedScore, ranked[1].relevance.weightedScore);
  assert.deepEqual(ranked.map(item => item.id), ['newer-partial-match', 'older-full-match']);
});

test('orders equal scores and creation times by ascending stable id', () => {
  const ranked = rankRelevantOutcomes([
    outcome('z-id', now.toISOString()),
    outcome('a-id', now.toISOString()),
  ], task, now);

  assert.deepEqual(ranked.map(item => item.id), ['a-id', 'z-id']);
});

test('excludes zero lexical matches', () => {
  const irrelevant = outcome('irrelevant', now.toISOString(), { objective: 'Write garden journal', capability: 'gardening', tags: ['plants'], lesson: 'No matching terms.' });

  assert.deepEqual(rankRelevantOutcomes([irrelevant], task, now), []);
});

test('returns at most five lexical matches', () => {
  const matching = Array.from({ length: 6 }, (_, index) => outcome(`match-${index}`, now.toISOString()));

  const ranked = rankRelevantOutcomes(matching, task, now);

  assert.equal(ranked.length, 5);
});

test('normalizes feedback reasons without retaining empty text', () => {
  const feedback = validateOutcomeFeedback({ rating: 'helpful', reason: '  Useful outcome  ' }, now);
  const withoutReason = validateOutcomeFeedback({ rating: 'neutral', reason: '   ' }, now);

  assert.deepEqual(feedback, { rating: 'helpful', reason: 'Useful outcome', createdAt: now.toISOString() });
  assert.deepEqual(withoutReason, { rating: 'neutral', createdAt: now.toISOString() });
});

test('rejects invalid feedback input and invalid clocks', () => {
  assert.throws(() => validateOutcomeFeedback({ rating: 'unknown' }, now));
  assert.throws(() => validateOutcomeFeedback({ rating: 'helpful', reason: 'x'.repeat(501) }, now));
  const credentialShapedReason = ['Bearer ', 'abcdefgh', 'ijklmnop', '1234'].join('');
  assert.throws(
    () => validateOutcomeFeedback({ rating: 'helpful', reason: credentialShapedReason }, now),
    error => error instanceof Error && !error.message.includes(credentialShapedReason),
  );
  assert.throws(() => validateOutcomeFeedback({ rating: 'helpful' }, new Date('invalid')));
  assert.throws(() => rankRelevantOutcomes([], task, new Date('invalid')));
});
