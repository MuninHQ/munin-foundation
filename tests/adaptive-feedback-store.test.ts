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

function safeOutcomeStateError(error: unknown): boolean {
  return error instanceof Error
    && error.name === 'OutcomeStateValidationError'
    && error.message === 'Invalid outcome state.';
}

class WriteObservingContextStore extends ContextStore {
  constructor(root: string, private readonly outcomeFile: string) { super(root); }

  override async event(type: string, entityType: MuninEvent['entityType'], entityId: string, payload: Record<string, unknown> = {}): Promise<MuninEvent> {
    const persisted = JSON.parse(await readFile(this.outcomeFile, 'utf8')) as { records: OutcomeRecord[] };
    assert.equal(persisted.records.find(record => record.id === entityId)?.feedback?.rating, payload.rating);
    return super.event(type, entityType, entityId, payload);
  }
}

class FailOnceContextStore extends ContextStore {
  attempts = 0;
  override async event(type: string, entityType: MuninEvent['entityType'], entityId: string, payload: Record<string, unknown> = {}): Promise<MuninEvent> {
    this.attempts += 1;
    if (this.attempts === 1) throw new Error('synthetic audit failure');
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

test('unsupported or malformed outcome state fails closed without rewriting bytes', async t => {
  const complete = outcome('valid', {
    orchestration: {
      id: 'orchestration-valid',
      objective: 'Build provider adapter',
      capability: 'provider',
      route: 'direct',
      risk: 'medium',
      providerPreference: ['ollama-local', 'deterministic-local'],
      localOnly: true,
      maxCostPerCall: 0,
      rationale: ['Use a governed local route.'],
      createdAt: '2026-09-01T12:00:00.000Z',
    },
  });
  const invalidRecordCases: Array<[string, unknown]> = [
    ['null record', null],
    ['record id', { ...complete, id: 7 }],
    ['record taskId', { ...complete, taskId: null }],
    ['record objective', { ...complete, objective: false }],
    ['record capability', { ...complete, capability: [] }],
    ['record route', { ...complete, route: null }],
    ['route primary', { ...complete, route: { ...complete.route, primary: 'administrator' } }],
    ['route reviewers', { ...complete, route: { ...complete.route, reviewers: ['reviewer', 7] } }],
    ['route rationale', { ...complete, route: { ...complete.route, rationale: [false] } }],
    ['record status', { ...complete, status: 'unknown' }],
    ['record evidence', { ...complete, evidence: ['valid', 7] }],
    ['record lesson', { ...complete, lesson: {} }],
    ['record tags', { ...complete, tags: [null] }],
    ['record createdAt', { ...complete, createdAt: 7 }],
    ['orchestration object', { ...complete, orchestration: null }],
    ['orchestration id', { ...complete, orchestration: { ...complete.orchestration, id: 7 } }],
    ['orchestration objective', { ...complete, orchestration: { ...complete.orchestration, objective: null } }],
    ['orchestration capability', { ...complete, orchestration: { ...complete.orchestration, capability: [] } }],
    ['orchestration route', { ...complete, orchestration: { ...complete.orchestration, route: 'future' } }],
    ['orchestration risk', { ...complete, orchestration: { ...complete.orchestration, risk: 'critical' } }],
    ['orchestration providers', { ...complete, orchestration: { ...complete.orchestration, providerPreference: ['ollama-local', 7] } }],
    ['orchestration localOnly', { ...complete, orchestration: { ...complete.orchestration, localOnly: false } }],
    ['orchestration cost', { ...complete, orchestration: { ...complete.orchestration, maxCostPerCall: 1 } }],
    ['orchestration rationale', { ...complete, orchestration: { ...complete.orchestration, rationale: [null] } }],
    ['orchestration createdAt', { ...complete, orchestration: { ...complete.orchestration, createdAt: false } }],
  ];
  const malformedFeedbackCases: Array<[string, unknown]> = [
    ['feedback object', null],
    ['feedback rating', { rating: 'trusted', createdAt: firstFeedbackAt.toISOString() }],
    ['feedback reason', { rating: 'helpful', reason: 7, createdAt: firstFeedbackAt.toISOString() }],
    ['feedback createdAt', { rating: 'helpful', createdAt: 7 }],
    ['feedback secret', { rating: 'helpful', reason: 'client_secret=stored-private-value', createdAt: firstFeedbackAt.toISOString() }],
  ];
  const states: Array<[string, string]> = [
    ['schema 99 with future metadata', `${JSON.stringify({ schemaVersion: 99, records: [complete], updatedAt: firstFeedbackAt.toISOString(), futureMetadata: { private: 'do-not-echo' } })}\n`],
    ['null top level', 'null\n'],
    ['array top level', '[]\n'],
    ['string top level', '"invalid"\n'],
    ['missing schema', `${JSON.stringify({ records: [complete], updatedAt: firstFeedbackAt.toISOString() })}\n`],
    ['non-array records', `${JSON.stringify({ schemaVersion: 2, records: {}, updatedAt: firstFeedbackAt.toISOString() })}\n`],
    ['non-string updatedAt', `${JSON.stringify({ schemaVersion: 2, records: [complete], updatedAt: 7 })}\n`],
    ['invalid updatedAt', `${JSON.stringify({ schemaVersion: 2, records: [complete], updatedAt: 'not-a-date' })}\n`],
    ['non-array pending audits', `${JSON.stringify({ schemaVersion: 2, records: [complete], updatedAt: firstFeedbackAt.toISOString(), pendingAudits: {} })}\n`],
    ['null pending audit', `${JSON.stringify({ schemaVersion: 2, records: [complete], updatedAt: firstFeedbackAt.toISOString(), pendingAudits: [null] })}\n`],
    ['pending audit id', `${JSON.stringify({ schemaVersion: 2, records: [complete], updatedAt: firstFeedbackAt.toISOString(), pendingAudits: [{ id: 7, outcomeId: 'valid', rating: 'helpful' }] })}\n`],
    ['pending audit outcome', `${JSON.stringify({ schemaVersion: 2, records: [complete], updatedAt: firstFeedbackAt.toISOString(), pendingAudits: [{ id: 'audit', outcomeId: null, rating: 'helpful' }] })}\n`],
    ['pending audit rating', `${JSON.stringify({ schemaVersion: 2, records: [complete], updatedAt: firstFeedbackAt.toISOString(), pendingAudits: [{ id: 'audit', outcomeId: 'valid', rating: 'trusted' }] })}\n`],
    ['invalid JSON', '{"schemaVersion":2'],
    ...invalidRecordCases.map(([name, record]) => [name, `${JSON.stringify({ schemaVersion: 2, records: [record], updatedAt: firstFeedbackAt.toISOString() })}\n`] as [string, string]),
    ['invalid orchestration createdAt', `${JSON.stringify({ schemaVersion: 2, records: [{ ...complete, orchestration: { ...complete.orchestration, createdAt: 'not-a-date' } }], updatedAt: firstFeedbackAt.toISOString() })}\n`],
    ...malformedFeedbackCases.map(([name, feedback]) => [name, `${JSON.stringify({ schemaVersion: 2, records: [{ ...complete, feedback }], updatedAt: firstFeedbackAt.toISOString() })}\n`] as [string, string]),
  ];

  for (const [name, serialized] of states) await t.test(name, async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-state-reject-'));
    const outcomeFile = path.join(root, 'adaptive-outcomes.json');
    await writeFile(outcomeFile, serialized, 'utf8');
    const before = await readFile(outcomeFile);
    const store = new JsonOutcomeStore(outcomeFile, { eventStore: new ContextStore(path.join(root, 'context')) });
    try {
      await assert.rejects(
        () => store.findRelevant({ id: 'query-private', objective: 'Build provider adapter', capability: 'provider' }, firstFeedbackAt),
        safeOutcomeStateError,
      );
      assert.deepEqual(await readFile(outcomeFile), before);
      await assert.rejects(
        () => store.recordFeedback('outcome-private', { rating: 'helpful', reason: 'private reason' }, firstFeedbackAt),
        safeOutcomeStateError,
      );
      assert.deepEqual(await readFile(outcomeFile), before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test('schema v1 ignores injected feedback and removes it only on successful migration', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-v1-injected-feedback-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const injected = outcome('injected', { feedback: { rating: 'harmful', reason: 'must be ignored', createdAt: firstFeedbackAt.toISOString() } });
  const state = { schemaVersion: 1, records: [injected, outcome('preserved')], updatedAt: firstFeedbackAt.toISOString() };
  await writeFile(outcomeFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  const before = await readFile(outcomeFile);
  const store = new JsonOutcomeStore(outcomeFile, { eventStore: new ContextStore(path.join(root, 'context')) });

  try {
    const ranked = await store.findRelevant({ id: 'query', objective: 'Build provider adapter', capability: 'provider' }, firstFeedbackAt);
    const loaded = ranked.find(record => record.id === 'injected');
    assert.equal(loaded?.feedback, undefined);
    assert.equal(loaded?.relevance.feedbackMultiplier, 1);
    assert.deepEqual(await readFile(outcomeFile), before);

    await store.save(outcome('new'));
    const migrated = JSON.parse(await readFile(outcomeFile, 'utf8')) as { schemaVersion: number; records: OutcomeRecord[] };
    assert.equal(migrated.schemaVersion, 2);
    assert.equal(migrated.records.find(record => record.id === 'injected')?.feedback, undefined);
    assert.equal(migrated.records.find(record => record.id === 'preserved')?.feedback, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('committed feedback survives audit failure and replays its reason-free event once', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-audit-replay-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const eventStore = new FailOnceContextStore(path.join(root, 'context'));
  const store = new JsonOutcomeStore(outcomeFile, { eventStore });
  try {
    await store.save(outcome('target'));
    const updated = await store.recordFeedback('target', { rating: 'harmful', reason: 'private local reason' }, firstFeedbackAt);
    assert.equal(updated.feedback?.rating, 'harmful');
    const pending = JSON.parse(await readFile(outcomeFile, 'utf8')) as { pendingAudits?: Array<Record<string, unknown>> };
    assert.equal(pending.pendingAudits?.length, 1);
    assert.equal(JSON.stringify(pending.pendingAudits).includes('private local reason'), false);

    await store.findRelevant({ id: 'replay', objective: 'Build provider adapter', capability: 'provider' }, secondFeedbackAt);
    await store.findRelevant({ id: 'replay-again', objective: 'Build provider adapter', capability: 'provider' }, secondFeedbackAt);
    const delivered = await eventStore.events();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].payload.rating, 'harmful');
    const cleared = JSON.parse(await readFile(outcomeFile, 'utf8')) as { pendingAudits?: unknown[] };
    assert.deepEqual(cleared.pendingAudits, []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('same-file store instances serialize concurrent save and feedback mutations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-concurrent-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const eventStore = new ContextStore(path.join(root, 'context'));
  const first = new JsonOutcomeStore(outcomeFile, { eventStore });
  const second = new JsonOutcomeStore(path.join(root, '.', 'adaptive-outcomes.json'), { eventStore });
  try {
    await first.save(outcome('target'));
    await Promise.all([
      first.save(outcome('concurrent-save')),
      second.recordFeedback('target', { rating: 'helpful' }, firstFeedbackAt),
    ]);
    const state = JSON.parse(await readFile(outcomeFile, 'utf8')) as { records: OutcomeRecord[] };
    assert.ok(state.records.some(record => record.id === 'concurrent-save'));
    assert.equal(state.records.find(record => record.id === 'target')?.feedback?.rating, 'helpful');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('successive feedback preserves durable audit ordering across a failed first delivery', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-audit-order-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const eventStore = new FailOnceContextStore(path.join(root, 'context'));
  const first = new JsonOutcomeStore(outcomeFile, { eventStore });
  const second = new JsonOutcomeStore(outcomeFile, { eventStore });
  try {
    await first.save(outcome('target'));
    await first.recordFeedback('target', { rating: 'helpful' }, firstFeedbackAt);
    await second.recordFeedback('target', { rating: 'harmful' }, secondFeedbackAt);
    const events = await eventStore.events();
    assert.deepEqual(events.map(event => event.payload.rating), ['helpful', 'harmful']);
    const state = JSON.parse(await readFile(outcomeFile, 'utf8')) as { pendingAudits?: unknown[]; records: OutcomeRecord[] };
    assert.deepEqual(state.pendingAudits, []);
    assert.equal(state.records.find(record => record.id === 'target')?.feedback?.rating, 'harmful');
  } finally { await rm(root, { recursive: true, force: true }); }
});
