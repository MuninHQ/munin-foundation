import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCapabilities } from '../src/capability-selector.js';

test('selects deterministic core plus only the cheapest available coverage', () => {
  const result = selectCapabilities({ required: ['repo.search', 'test.run'], descriptors: [
    { id: 'core-rg', provides: ['repo.search'], activationCost: 0, locality: 'local', available: true, core: true },
    { id: 'core-test', provides: ['test.run'], activationCost: 0, locality: 'local', available: true },
    { id: 'github', provides: ['repo.search', 'issues.read'], activationCost: 5, locality: 'external', available: true },
    { id: 'slack', provides: ['chat.read'], activationCost: 5, locality: 'external', available: false },
  ] });
  assert.deepEqual(result.active.map(item => item.id), ['core-rg', 'core-test']);
  assert.deepEqual(result.inactive.map(item => item.id).sort(), ['github', 'slack']);
});

test('missing optional capability degrades without blocking core selection', () => {
  const result = selectCapabilities({ required: ['repo.search'], optional: ['chat.read'], descriptors: [{ id: 'core-rg', provides: ['repo.search'], activationCost: 0, locality: 'local', available: true, core: true }] });
  assert.deepEqual(result.missingOptional, ['chat.read']);
  assert.equal(result.blocked, false);
});
