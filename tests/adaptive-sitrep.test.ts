import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSitrep } from '../src/sitrep.js';
import type { MuninEvent, MuninState } from '../src/types.js';

const state: MuninState = { projects: [], decisions: [], actions: [], jobs: [], research: [], goals: [], relations: [] };

test('sitrep exposes reviewer validation and outcome memory for adaptive executions', () => {
  const event: MuninEvent = {
    id: 'evt-1', type: 'action.executed', entityType: 'action', entityId: 'act-110', timestamp: new Date().toISOString(),
    payload: {
      adaptiveOutcomeId: 'outcome-act-110-1',
      route: { primary: 'builder', reviewers: ['reviewer'] },
      validation: { passed: true, checks: [{ name: 'tests', passed: true }] },
    },
  };
  const report = generateSitrep(state, [event]);
  assert.match(report, /Adaptive execution:/);
  assert.match(report, /act-110: validated — builder \+ reviewer — memory outcome-act-110-1/);
});
