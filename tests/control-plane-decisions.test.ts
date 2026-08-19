import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activeControlPlaneDecisions,
  createControlPlaneDecision,
  supersedeControlPlaneDecision,
} from '../src/control-plane-decisions.js';

function decision(id: string, text: string) {
  return createControlPlaneDecision({
    id,
    decision: text,
    context: 'Control Plane v1',
    rationale: 'Keep operational decisions recoverable across sessions.',
    alternativesConsidered: ['Chat-only history'],
    affectedRefs: ['github:issue:227'],
    source: 'github:issue:227',
  });
}

test('creates a complete decision record with timestamp', () => {
  const created = decision('dec-1', 'GitHub remains product source of truth.');
  assert.equal(created.id, 'dec-1');
  assert.ok(created.decidedAt.length > 0);
  assert.equal(created.supersededBy, undefined);
});

test('requires core decision fields', () => {
  assert.throws(
    () => createControlPlaneDecision({
      id: '',
      decision: 'x',
      context: 'x',
      rationale: 'x',
      alternativesConsidered: [],
      affectedRefs: [],
      source: 'x',
    }),
    /Decision id is required/,
  );
});

test('supersedes a decision explicitly in both directions', () => {
  const previous = decision('dec-1', 'Work owns orchestration.');
  const next = decision('dec-2', 'Munin owns orchestration after migration.');
  const [oldRecord, newRecord] = supersedeControlPlaneDecision(previous, next);

  assert.equal(oldRecord.supersededBy, 'dec-2');
  assert.equal(newRecord.supersedes, 'dec-1');
  assert.deepEqual(activeControlPlaneDecisions([oldRecord, newRecord]).map((item) => item.id), ['dec-2']);
});

test('rejects inconsistent supersession', () => {
  const previous = decision('dec-1', 'Previous');
  const next = { ...decision('dec-2', 'Next'), supersedes: 'dec-other' };
  assert.throws(() => supersedeControlPlaneDecision(previous, next), /different superseded decision/);
});
