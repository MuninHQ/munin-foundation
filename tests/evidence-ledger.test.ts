import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvidenceLedger } from '../src/evidence-ledger.js';

test('evidence ledger persists redacted provenance with content hashes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'munin-evidence-'));
  const path = join(root, 'evidence.jsonl');
  try {
    const ledger = new EvidenceLedger(path);
    const first = await ledger.append({
      kind: 'web',
      title: 'OpenMuse architecture',
      source: 'github',
      url: 'https://github.com/CopilotKit/openmuse',
      content: 'persistent browser sessions',
      metadata: { token: 'secret-value', module: 'browser' },
    }, '2026-10-03T01:00:00.000Z');
    const second = await ledger.append({
      kind: 'artifact',
      title: 'Adoption decision',
      summary: 'api_key=must-not-persist',
      parentIds: [first.id],
      content: 'adopt lease recovery',
    }, '2026-10-03T01:01:00.000Z');

    assert.equal(second.previousHash, first.recordHash);
    assert.equal(second.parentIds[0], first.id);
    assert.equal((await ledger.verify()).valid, true);
    const serialized = await readFile(path, 'utf8');
    assert.doesNotMatch(serialized, /secret-value|must-not-persist/);
    assert.match(serialized, /contentHash/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('evidence ledger detects tampering in the hash chain', async () => {
  const root = await mkdtemp(join(tmpdir(), 'munin-evidence-tamper-'));
  const path = join(root, 'evidence.jsonl');
  try {
    const ledger = new EvidenceLedger(path);
    await ledger.append({ kind: 'system', title: 'one', content: 'alpha' });
    await ledger.append({ kind: 'system', title: 'two', content: 'beta' });
    const rows = (await readFile(path, 'utf8')).trim().split(/\r?\n/);
    const first = JSON.parse(rows[0]) as Record<string, unknown>;
    first.title = 'tampered';
    rows[0] = JSON.stringify(first);
    await writeFile(path, rows.join('\n') + '\n', 'utf8');
    const verification = await ledger.verify();
    assert.equal(verification.valid, false);
    assert.match(verification.reason ?? '', /hash mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
