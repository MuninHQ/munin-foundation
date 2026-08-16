import test from 'node:test';
import assert from 'node:assert/strict';
import { RepoIntelligenceProvider } from '../src/repo-intelligence.js';

test('health always exposes native fallback when optional providers are absent', async () => {
  const provider = new RepoIntelligenceProvider('/repo', async () => ({ ok: false, stdout: '', stderr: 'not installed' }));
  const health = await provider.health();
  assert.equal(health.find((item) => item.source === 'rag-rat')?.available, false);
  assert.equal(health.find((item) => item.source === 'graphify')?.available, false);
  assert.equal(health.find((item) => item.source === 'native')?.available, true);
});

test('impact fails open to native inspection without fabricating indexed evidence', async () => {
  const provider = new RepoIntelligenceProvider('/repo', async () => ({ ok: false, stdout: '', stderr: 'missing' }));
  const result = await provider.impact('change durable effects');
  assert.equal(result.coverage, 'unknown');
  assert.deepEqual(result.files, []);
  assert.equal(result.evidence[0]?.source, 'native');
});

test('impact uses rag-rat JSON when available', async () => {
  const provider = new RepoIntelligenceProvider('/repo', async (_file, args) => {
    if (args[0] === 'impact-surface') return { ok: true, stdout: JSON.stringify({ files: ['src/a.ts'], symbols: ['execute'], tests: ['tests/a.test.ts'], confidence: 0.94, rationale: 'source anchored' }), stderr: '' };
    return { ok: false, stdout: '', stderr: '' };
  });
  const result = await provider.impact('execute');
  assert.equal(result.coverage, 'indexed');
  assert.deepEqual(result.files, ['src/a.ts']);
  assert.deepEqual(result.tests, ['tests/a.test.ts']);
  assert.equal(result.evidence[0]?.source, 'rag-rat');
  assert.equal(result.evidence[0]?.confidence, 0.94);
});
