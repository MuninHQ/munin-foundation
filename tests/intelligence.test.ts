import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeGraph, buildTimeline, generateDailyBrief, resolveContext } from '../src/intelligence.js';
import type { MuninEvent, MuninState } from '../src/types.js';

const state: MuninState = {
  projects: [{ id: 'prj-1', name: 'Munin Workspace', priority: 'P0', status: 'active', currentOutcome: 'Live', nextAction: 'Ship intelligence', blockers: [], updatedAt: '2026-08-01T10:00:00.000Z' }],
  decisions: [],
  actions: [{ id: 'act-1', title: 'Preparar entrevista B3', projectId: 'prj-1', priority: 'P0', status: 'active', createdAt: '2026-08-05T10:00:00.000Z', updatedAt: '2026-08-05T10:00:00.000Z' }],
  jobs: [{ id: 'job-1', company: 'B3', role: 'Digital Assets', status: 'interview', fitScore: 95, matchedSignals: ['digital assets'], followUpAt: '2026-08-05T10:00:00.000Z', createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-05T10:00:00.000Z' }],
  research: [{ id: 'res-1', question: 'Como Drex se conecta a ativos digitais?', projectId: 'prj-1', status: 'open', evidence: [{ id: 'evd-1', title: 'BCB', url: 'https://example.com', sourceType: 'primary', capturedAt: '2026-08-05T10:00:00.000Z' }], syntheses: [], createdAt: '2026-08-05T10:00:00.000Z', updatedAt: '2026-08-05T10:00:00.000Z' }],
  relations: [],
};

const events: MuninEvent[] = [
  { id: 'evt-1', type: 'project.created', entityType: 'project', entityId: 'prj-1', timestamp: '2026-08-01T10:00:00.000Z', payload: {} },
  { id: 'evt-2', type: 'job.updated', entityType: 'job', entityId: 'job-1', timestamp: '2026-08-05T12:00:00.000Z', payload: {} },
];

test('builds a reverse chronological timeline with entity labels', () => {
  const timeline = buildTimeline(state, events);
  assert.equal(timeline[0].title, 'B3 — Digital Assets');
  assert.equal(timeline[1].title, 'Munin Workspace');
});

test('builds graph with inferred project relationships', () => {
  const graph = buildKnowledgeGraph(state);
  assert.equal(graph.nodes.length, 4);
  assert.ok(graph.edges.some(edge => edge.source === 'act-1' && edge.target === 'prj-1' && edge.inferred));
  assert.ok(graph.edges.some(edge => edge.source === 'res-1' && edge.target === 'prj-1' && edge.inferred));
});

test('resolves contextual references deterministically', () => {
  const matches = resolveContext(state, 'atualiza B3 digital assets');
  assert.equal(matches[0].entityId, 'job-1');
  assert.ok(matches[0].score >= 80);
});

test('daily brief highlights follow-ups, interviews, stale projects and research', () => {
  const brief = generateDailyBrief(state, new Date('2026-08-06T12:00:00.000Z'));
  assert.ok(brief.priorities.some(item => item.includes('Follow-up: B3')));
  assert.ok(brief.priorities.some(item => item.includes('Entrevista ativa: B3')));
  assert.ok(brief.alerts.some(item => item.includes('Munin Workspace')));
  assert.ok(brief.alerts.some(item => item.includes('aguardando síntese')));
});
