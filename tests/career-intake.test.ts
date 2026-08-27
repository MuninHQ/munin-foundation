import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ingestCareerItem, scoreCareerMatch } from '../src/career-intake.js';
import { MemoryLedger } from '../src/memory-ledger.js';
import { ContextStore } from '../src/store.js';

test('career intake normalizes a shared job and persists it once', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-career-intake-'));
  const store = new ContextStore(root);
  const ledger = new MemoryLedger(root);
  const input = {
    source: 'share_sheet' as const,
    url: 'https://example.com/jobs/123',
    title: 'Senior Product Manager at Example Bank',
    text: 'Lead payments, Open Finance and digital assets product strategy.',
  };
  const first = await ingestCareerItem(input, { store, ledger });
  const second = await ingestCareerItem(input, { store, ledger });
  assert.equal(first.added, true);
  assert.equal(first.job.company, 'Example Bank');
  assert.equal(first.job.role, 'Senior Product Manager');
  assert.ok(first.job.fitScore > 0);
  assert.ok(first.job.matchedSignals.includes('payments'));
  assert.equal(first.job.description, input.text);
  assert.equal(second.added, false);
  assert.equal(second.duplicateOf, first.job.id);
  assert.equal((await store.load()).jobs.length, 1);
  assert.equal((await ledger.list({ kind: 'career_intake' })).length, 1);
});

test('image intake uses an injected extractor without storing image bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-career-intake-'));
  const secretImage='SUPER_SECRET_IMAGE_BYTES';
  const result = await ingestCareerItem({ source: 'screenshot', image: { mimeType: 'image/png', transientRef: 'ios-share-sheet:42', dataBase64: secretImage }, title: 'Principal Product Manager at Fintech X' }, {
    store: new ContextStore(root),
    ledger: new MemoryLedger(root),
    extractor: { extract: async input => { assert.equal(input.image?.dataBase64,secretImage); return 'Principal Product Manager. Payments and Open Banking.'; } },
  });
  assert.equal(result.added, true);
  assert.equal(result.job.company, 'Fintech X');
  assert.equal(result.job.description, 'Principal Product Manager. Payments and Open Banking.');
  assert.ok(!JSON.stringify(result.job).includes(secretImage));
  assert.ok(!(await readFile(path.join(root,'memory-ledger.jsonl'),'utf8')).includes(secretImage));
  assert.ok(!(await readFile(path.join(root,'events.jsonl'),'utf8')).includes(secretImage));
});

test('screenshot without extracted text or extractor fails explicitly', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-career-intake-'));
  await assert.rejects(() => ingestCareerItem({ source: 'screenshot', image: { mimeType: 'image/png' } }, { store: new ContextStore(root), ledger: new MemoryLedger(root) }), /CAREER_INTAKE_EXTRACTOR_REQUIRED/);
});

test('career match profile scoring is deterministic', () => {
  const result = scoreCareerMatch('Payments and Open Finance leadership', { signals: ['payments', 'open finance', 'retail'], strongSignals: ['payments'] });
  assert.deepEqual(result.matchedSignals, ['payments', 'open finance']);
  assert.equal(result.score, 75);
});
