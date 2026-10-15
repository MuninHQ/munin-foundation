import test from 'node:test';
import assert from 'node:assert/strict';
import { RepositoryContextSelector } from '../src/repository-context-selector.js';

test('git and rg evidence admit bounded excerpts while broad reads are refused', async () => {
  const selector = new RepositoryContextSelector({
    readText: async path => path.endsWith('target.ts') ? `${'x'.repeat(40)}\nneedle\n${'y'.repeat(40)}` : 'unrelated',
    run: async command => command.kind === 'git-status' ? { ok: true, lines: ['src/changed.ts'] } : { ok: true, lines: ['src/target.ts:2:needle'] },
    isTracked: async () => true,
  });
  const result = await selector.select({ root: 'C:/repo', objective: 'fix needle', budget: { maxChars: 120, maxEstimatedTokens: 30, maxFileChars: 100 } });
  assert.ok(result.selection.selected.some(item => item.path === 'src/target.ts'));
  assert.equal(result.broadReadRefused, true);
  assert.deepEqual(result.discovery.map(item => item.kind), ['git-status', 'rg']);
});

test('failed discovery degrades without recursively reading the repository', async () => {
  let reads = 0;
  const selector = new RepositoryContextSelector({
    readText: async () => { reads += 1; return 'unexpected'; },
    run: async () => ({ ok: false, lines: [], error: 'command unavailable' }),
    isTracked: async () => false,
  });
  const result = await selector.select({ root: 'C:/repo', objective: 'unknown work', budget: { maxChars: 120, maxEstimatedTokens: 30, maxFileChars: 100 } });
  assert.equal(result.degraded, true);
  assert.equal(result.broadReadRefused, true);
  assert.equal(result.selection.selected.length, 0);
  assert.equal(reads, 0);
});
