import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCapability, assessGithubMomentum, CapabilityDecisionLog } from '../src/capability-radar.js';

const trendingGithub = {
  stars: 20_000,
  forks: 1_000,
  createdAt: '2026-01-01T00:00:00.000Z',
  pushedAt: '2026-08-20T00:00:00.000Z',
  observedAt: '2026-08-23T00:00:00.000Z',
};

test('radar hard-rejects paid or metered candidates by default', () => {
  assert.equal(assessCapability({ id:'paid', name:'Paid', source:'x', license:'MIT', metered:true, securityScore:1, maintenanceScore:1 }).decision, 'reject');
});

test('radar adopts strong zero-cost GitHub candidates and reviews weak evidence', () => {
  const good = assessCapability({ id:'good', name:'Good', source:'github', license:'MIT', securityScore:.9, maintenanceScore:.8, duplicationScore:.1, github:trendingGithub });
  assert.equal(good.decision, 'adopt');
  const weak = assessCapability({ id:'weak', name:'Weak', source:'github', securityScore:.4, maintenanceScore:.9, duplicationScore:.1, github:trendingGithub });
  assert.equal(weak.decision, 'review');
});

test('GitHub momentum distinguishes current growth from old star count', () => {
  const trending = assessGithubMomentum(trendingGithub);
  const stale = assessGithubMomentum({
    stars: 80_000,
    forks: 8_000,
    createdAt: '2015-01-01T00:00:00.000Z',
    pushedAt: '2024-01-01T00:00:00.000Z',
    observedAt: '2026-08-23T00:00:00.000Z',
  });
  assert.ok(trending.score > stale.score);
  assert.ok(trending.starsPerDay > stale.starsPerDay);
  assert.ok(stale.reasons.some(reason => reason.includes('180 days')));
});

test('radar requires momentum evidence for GitHub adoption and rejects archived repositories', () => {
  const missing = assessCapability({ id:'missing', name:'Missing', source:'github', license:'MIT', securityScore:.9, maintenanceScore:.9, duplicationScore:.1 });
  assert.equal(missing.decision, 'review');
  assert.ok(missing.reasons.includes('GitHub momentum evidence missing.'));

  const archived = assessCapability({ id:'archived', name:'Archived', source:'github', license:'MIT', securityScore:1, maintenanceScore:1, github:{...trendingGithub,archived:true} });
  assert.equal(archived.decision, 'reject');
});

test('invalid or future GitHub dates fail closed', () => {
  const result = assessGithubMomentum({...trendingGithub,createdAt:'not-a-date'});
  assert.equal(result.score,0);
  assert.ok(result.reasons.includes('GitHub momentum dates are invalid.'));
});

test('decision log prevents repeated research until explicitly revisited', () => {
  const log = new CapabilityDecisionLog();
  assert.equal(log.shouldReassess('x'), true);
  log.record({ id:'x', decision:'reject', score:0, reasons:['duplicate'] });
  assert.equal(log.shouldReassess('x'), false);
  assert.equal(log.list().length, 1);
});
