import test from 'node:test';
import assert from 'node:assert/strict';
import { decideByConsensus, zeroCostGate } from '../src/consensus-committee.js';
import { resolveBlocker } from '../src/blocker-resolver.js';

test('committee approves strong evidence without hard blocks', () => {
  const decision = decideByConsensus([
    { role:'product', vote:'approve', reason:'high value' },
    { role:'architecture', vote:'approve', reason:'fits boundaries' },
    { role:'security', vote:'approve', reason:'safe' },
    { role:'qa', vote:'approve', reason:'testable' },
    zeroCostGate({ recurringCost:0 }),
  ]);
  assert.equal(decision.outcome, 'approve');
});

test('cost guardian hard-blocks unapproved paid defaults', () => {
  const opinion = zeroCostGate({ meteredService:true });
  assert.equal(opinion.vote, 'block');
  const decision = decideByConsensus([
    { role:'product', vote:'approve', reason:'useful' },
    { role:'architecture', vote:'approve', reason:'fits' },
    { role:'security', vote:'approve', reason:'safe' },
    opinion,
  ]);
  assert.equal(decision.outcome, 'block');
});

test('physical blocker is lane-local and human queued', () => {
  const r = resolveBlocker('Needs validation on Windows host physical device');
  assert.equal(r.boundary, 'device');
  assert.equal(r.humanRequired, true);
  assert.equal(r.deferLane, true);
  assert.match(r.strategy, /continue cloud\/repository lanes/i);
});

test('repository blocker must be recovered autonomously first', () => {
  const r = resolveBlocker('GitHub CI failed on branch');
  assert.equal(r.humanRequired, false);
  assert.equal(r.deferLane, false);
});
