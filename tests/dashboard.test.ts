import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCommandCenter } from '../src/dashboard.js';
import type { MuninState } from '../src/types.js';

function state(): MuninState {
  return {
    projects: [{ id: 'prj-1', name: 'Command Center', priority: 'P0', status: 'active', currentOutcome: 'Building dashboard', blockers: [], updatedAt: '2026-08-05T12:00:00.000Z' }],
    decisions: [{ id: 'dec-1', title: 'Choose deployment target', status: 'required', createdAt: '2026-08-05T12:00:00.000Z' }],
    actions: [{ id: 'act-1', title: 'Ship dashboard', priority: 'P0', status: 'active', dueAt: '2026-08-06T12:00:00.000Z', createdAt: '2026-08-05T12:00:00.000Z', updatedAt: '2026-08-05T12:00:00.000Z' }],
    jobs: [{ id: 'job-1', company: 'Example Bank', role: 'Head of Product', status: 'interview', fitScore: 90, matchedSignals: ['product'], followUpAt: '2026-08-04T12:00:00.000Z', createdAt: '2026-08-01T12:00:00.000Z', updatedAt: '2026-08-01T12:00:00.000Z' }],
    research: [{ id: 'res-1', question: 'What should the dashboard show?', status: 'open', evidence: [{ id: 'evd-1', title: 'User needs', url: 'https://example.com', sourceType: 'primary', capturedAt: '2026-08-05T12:00:00.000Z' }], syntheses: [], createdAt: '2026-08-05T12:00:00.000Z', updatedAt: '2026-08-05T12:00:00.000Z' }],
    relations: [{ id: 'rel-1', sourceType: 'decision', sourceId: 'dec-1', type: 'blocks', targetType: 'action', targetId: 'act-1', createdAt: '2026-08-05T12:00:00.000Z' }],
  };
}

test('command center consolidates operational domains and alerts', () => {
  const report = generateCommandCenter(state(), [], new Date('2026-08-05T15:00:00.000Z'));
  assert.match(report, /Health: ATTENTION/);
  assert.match(report, /Projects active\/blocked: 1/);
  assert.match(report, /Career interviews\/offers: 1\/0/);
  assert.match(report, /Career follow-up due: Example Bank/);
  assert.match(report, /Research awaiting synthesis/);
  assert.match(report, /Blocked: decision\/dec-1 -> action\/act-1/);
  assert.match(report, /2026-08-06 — Ship dashboard/);
});

test('command center stays stable with empty state', () => {
  const empty: MuninState = { projects: [], decisions: [], actions: [], jobs: [], research: [], relations: [] };
  const report = generateCommandCenter(empty, [], new Date('2026-08-05T15:00:00.000Z'));
  assert.match(report, /Health: STABLE/);
  assert.match(report, /No critical alerts/);
  assert.match(report, /No recorded activity/);
});
