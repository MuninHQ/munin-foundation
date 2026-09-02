import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  InMemoryOutcomeStore,
  JsonOutcomeStore,
  OutcomeFeedbackValidationError,
  OutcomeNotFoundError,
  type OutcomeRecord,
} from '../src/adaptive-execution.js';
import { ContextStore } from '../src/store.js';
import type { MuninEvent } from '../src/types.js';

const firstFeedbackAt = new Date('2026-09-02T12:00:00.000Z');
const secondFeedbackAt = new Date('2026-09-03T12:00:00.000Z');

function outcome(id: string, overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    id,
    taskId: `task-${id}`,
    objective: 'Build provider adapter',
    capability: 'provider',
    route: { primary: 'builder', reviewers: ['reviewer'], rationale: [] },
    status: 'passed',
    evidence: [`evidence-${id}`],
    lesson: `Provider lesson ${id}`,
    tags: ['provider'],
    createdAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

class WriteObservingContextStore extends ContextStore {
  constructor(root: string, private readonly outcomeFile: string) { super(root); }

  override async event(type: string, entityType: MuninEvent['entityType'], entityId: string, payload: Record<string, unknown> = {}): Promise<MuninEvent> {
    const persisted = JSON.parse(await readFile(this.outcomeFile, 'utf8')) as { records: OutcomeRecord[] };
    assert.equal(persisted.records.find(record => record.id === entityId)?.feedback?.rating, payload.rating);
    return super.event(type, entityType, entityId, payload);
  }
}

test('loads schema v1 without rewriting it and replaces only matching feedback in schema v2', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-feedback-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const eventRoot = path.join(root, 'context');
  const originalRecords = [outcome('target'), outcome('preserved')];
  const schemaV1 = { schemaVersion: 1, records: originalRecords, updatedAt: '2026-09-01T00:00:00.000Z' };
  await writeFile(outcomeFile, `${JSON.stringify(schemaV1, null, 2)}\n`, 'utf8');
  const beforeLoad = await readFile(outcomeFile);
  const eventStore = new WriteObservingContextStore(eventRoot, outcomeFile);
  const store = new JsonOutcomeStore(outcomeFile, { eventStore });

  try {
    const loaded = await store.findRelevant({ id: 'query', objective: 'Build provider adapter', capability: 'provider' }, firstFeedbackAt);
    assert.deepEqual(loaded.map(record => record.id), ['preserved', 'target']);
    assert.equal(loaded[0].relevance.ageDays, 1);
    assert.deepEqual(await readFile(outcomeFile), beforeLoad);

    const first = await store.recordFeedback('target', { rating: 'helpful', reason: '  Reusable guidance  ' }, firstFeedbackAt);
    assert.deepEqual(first.feedback, { rating: 'helpful', reason: 'Reusable guidance', createdAt: firstFeedbackAt.toISOString() });

    const firstState = JSON.parse(await readFile(outcomeFile, 'utf8')) as { schemaVersion: number; records: OutcomeRecord[] };
    assert.equal(firstState.schemaVersion, 2);
    assert.deepEqual(firstState.records.find(record => record.id === 'preserved'), originalRecords[1]);
    assert.deepEqual(firstState.records.find(record => record.id === 'target'), first);

    const second = await store.recordFeedback('target', { rating: 'harmful' }, secondFeedbackAt);
    assert.deepEqual(second.feedback, { rating: 'harmful', createdAt: secondFeedbackAt.toISOString() });
    const secondState = JSON.parse(await readFile(outcomeFile, 'utf8')) as { schemaVersion: number; records: OutcomeRecord[] };
    assert.deepEqual(secondState.records.find(record => record.id === 'target'), second);
    assert.deepEqual(secondState.records.find(record => record.id === 'preserved'), originalRecords[1]);
    assert.deepEqual((await readdir(root)).sort(), ['adaptive-outcomes.json', 'context']);

    const events = await eventStore.events();
    assert.equal(events.length, 2);
    assert.deepEqual(events.map(event => ({ type: event.type, entityType: event.entityType, entityId: event.entityId, payload: event.payload })), [
      { type: 'adaptive.outcome.feedback.updated', entityType: 'system', entityId: 'target', payload: { rating: 'helpful' } },
      { type: 'adaptive.outcome.feedback.updated', entityType: 'system', entityId: 'target', payload: { rating: 'harmful' } },
    ]);
    assert.equal(JSON.stringify(events).includes('Reusable guidance'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects invalid or unknown JSON feedback without changing outcome bytes or audit events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-feedback-reject-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const eventStore = new ContextStore(path.join(root, 'context'));
  const store = new JsonOutcomeStore(outcomeFile, { eventStore });
  await store.save(outcome('target'));
  const credentialShapedReason = ['Bearer ', 'abcdefgh', 'ijklmnop', '1234'].join('');

  try {
    const rejected: Array<{ id: string; input: unknown; error: typeof OutcomeFeedbackValidationError | typeof OutcomeNotFoundError }> = [
      { id: 'target', input: { rating: 'invalid' }, error: OutcomeFeedbackValidationError },
      { id: 'target', input: { rating: 'helpful', reason: 'x'.repeat(501) }, error: OutcomeFeedbackValidationError },
      { id: 'target', input: { rating: 'helpful', reason: credentialShapedReason }, error: OutcomeFeedbackValidationError },
      { id: 'missing', input: { rating: 'helpful' }, error: OutcomeNotFoundError },
    ];

    for (const rejection of rejected) {
      const before = await readFile(outcomeFile);
      await assert.rejects(
        () => store.recordFeedback(rejection.id, rejection.input, firstFeedbackAt),
        error => error instanceof Error
          && error instanceof rejection.error
          && !error.message.includes(rejection.id)
          && !error.message.includes(credentialShapedReason),
      );
      assert.deepEqual(await readFile(outcomeFile), before);
    }
    assert.deepEqual(await eventStore.events(), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('in-memory feedback validates before lookup and replaces rather than mutates records', async () => {
  const store = new InMemoryOutcomeStore();
  const original = outcome('target');
  await store.save(original);

  await assert.rejects(
    () => store.recordFeedback('missing', { rating: 'invalid' }, firstFeedbackAt),
    OutcomeFeedbackValidationError,
  );
  assert.equal(original.feedback, undefined);

  const updated = await store.recordFeedback('target', { rating: 'helpful' }, firstFeedbackAt);
  assert.notEqual(updated, original);
  assert.equal(original.feedback, undefined);
  assert.equal(updated.feedback?.rating, 'helpful');
  await assert.rejects(() => store.recordFeedback('missing', { rating: 'neutral' }, firstFeedbackAt), OutcomeNotFoundError);
});

test('successful JSON saves use schema v2 and retain the 500-record bound', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-save-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const store = new JsonOutcomeStore(outcomeFile);

  try {
    for (let index = 0; index < 501; index += 1) await store.save(outcome(`record-${index}`));
    const state = JSON.parse(await readFile(outcomeFile, 'utf8')) as { schemaVersion: number; records: OutcomeRecord[] };
    assert.equal(state.schemaVersion, 2);
    assert.equal(state.records.length, 500);
    assert.equal(state.records[0].id, 'record-500');
    assert.equal(state.records.some(record => record.id === 'record-0'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('feedback migration keeps oversized legacy state within the 500-record bound', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-feedback-bound-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const records = Array.from({ length: 501 }, (_, index) => outcome(`record-${index}`));
  await writeFile(outcomeFile, `${JSON.stringify({ schemaVersion: 1, records, updatedAt: firstFeedbackAt.toISOString() }, null, 2)}\n`, 'utf8');
  const store = new JsonOutcomeStore(outcomeFile, { eventStore: new ContextStore(path.join(root, 'context')) });

  try {
    await store.recordFeedback('record-0', { rating: 'neutral' }, firstFeedbackAt);
    const state = JSON.parse(await readFile(outcomeFile, 'utf8')) as { records: OutcomeRecord[] };
    assert.equal(state.records.length, 500);
    assert.equal(state.records[0].feedback?.rating, 'neutral');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
