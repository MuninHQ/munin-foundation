import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgentScorecard, rankAgents } from '../src/agent-scorecards.js';

test('scorecards reward completion and evidence while penalizing retries and escaped defects', () => {
  const strong = buildAgentScorecard('strong', [
    { agentId:'strong', completed:true, evidenceCount:2, retries:0 },
    { agentId:'strong', completed:true, evidenceCount:1, retries:0 },
  ]);
  const weak = buildAgentScorecard('weak', [
    { agentId:'weak', completed:false, evidenceCount:0, retries:2, defectEscaped:true, humanEscalation:true },
  ]);
  assert.ok(strong.score > weak.score);
  assert.equal(strong.completionRate, 1);
  assert.equal(weak.defectEscapeRate, 1);
});

test('rankAgents sorts by score then evidence depth via sample count tie-break', () => {
  const a = buildAgentScorecard('a', [{ agentId:'a', completed:true, evidenceCount:1, retries:0 }]);
  const b = buildAgentScorecard('b', [{ agentId:'b', completed:false, evidenceCount:0, retries:2 }]);
  assert.deepEqual(rankAgents([b,a]).map(x=>x.agentId), ['a','b']);
});
