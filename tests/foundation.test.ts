import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApiSnapshot, validateState } from '../src/foundation.js';
import type { MuninState } from '../src/types.js';

const emptyState = (): MuninState => ({
  projects: [], decisions: [], actions: [], jobs: [], research: [], relations: [],
});

test('foundation validates a consistent state', () => {
  const state = emptyState();
  state.projects.push({
    id: 'prj-1', name: 'Foundation', priority: 'P1', status: 'active',
    currentOutcome: 'Hardening', blockers: [], updatedAt: '2026-08-05T12:00:00.000Z',
  });
  state.actions.push({
    id: 'act-1', title: 'Validate state', projectId: 'prj-1', priority: 'P1',
    status: 'planned', createdAt: '2026-08-05T12:00:00.000Z', updatedAt: '2026-08-05T12:00:00.000Z',
  });
  state.relations.push({
    id: 'rel-1', sourceType: 'action', sourceId: 'act-1', type: 'supports',
    targetType: 'project', targetId: 'prj-1', createdAt: '2026-08-05T12:00:00.000Z',
  });

  const report = validateState(state, new Date('2026-08-05T13:00:00.000Z'));
  assert.equal(report.valid, true);
  assert.equal(report.issues.length, 0);
  assert.equal(report.counts.relations, 1);
});

test('foundation reports duplicate ids and orphan relations', () => {
  const state = emptyState();
  const project = {
    id: 'prj-duplicate', name: 'One', priority: 'P1' as const, status: 'active' as const,
    currentOutcome: 'Testing', blockers: [], updatedAt: '2026-08-05T12:00:00.000Z',
  };
  state.projects.push(project, { ...project, name: 'Two' });
  state.relations.push({
    id: 'rel-orphan', sourceType: 'action', sourceId: 'missing-action', type: 'supports',
    targetType: 'project', targetId: 'prj-duplicate', createdAt: '2026-08-05T12:00:00.000Z',
  });

  const report = validateState(state);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(issue => issue.code === 'duplicate_id'));
  assert.ok(report.issues.some(issue => issue.code === 'orphan_relation_source'));
});

test('API snapshot exposes stable schema and degraded health', () => {
  const state = emptyState();
  state.relations.push({
    id: 'rel-orphan', sourceType: 'job', sourceId: 'missing', type: 'relates_to',
    targetType: 'project', targetId: 'missing', createdAt: '2026-08-05T12:00:00.000Z',
  });

  const snapshot = buildApiSnapshot(state, new Date('2026-08-05T13:00:00.000Z'));
  assert.equal(snapshot.schemaVersion, '1.0');
  assert.equal(snapshot.health, 'degraded');
  assert.equal(snapshot.generatedAt, '2026-08-05T13:00:00.000Z');
  assert.equal(snapshot.summary.relations, 1);
  assert.equal(snapshot.integrity.valid, false);
});
