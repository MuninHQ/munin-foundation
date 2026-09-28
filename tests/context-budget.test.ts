import test from 'node:test';
import assert from 'node:assert/strict';
import { applyContextBudget } from '../src/context-budget.js';

test('selection requires evidence and stops at the configured character budget', () => {
  const result = applyContextBudget([
    { path: 'src/a.ts', content: 'a'.repeat(80), evidence: ['rg:a'] },
    { path: 'src/b.ts', content: 'b'.repeat(80), evidence: [] },
    { path: 'src/c.ts', content: 'c'.repeat(80), evidence: ['git:changed'] },
  ], { maxChars: 100, maxEstimatedTokens: 25, maxFileChars: 90 });
  assert.deepEqual(result.selected.map(item => item.path), ['src/a.ts']);
  assert.equal(result.rejected.find(item => item.path === 'src/b.ts')?.reason, 'missing-relevance-evidence');
  assert.equal(result.usedChars, 80);
  assert.equal(result.avoidedChars, 160);
});

test('invalid budgets fail before candidate content is inspected', () => {
  assert.throws(() => applyContextBudget([], { maxChars: 0, maxEstimatedTokens: 10, maxFileChars: 10 }), /maxChars/);
});
