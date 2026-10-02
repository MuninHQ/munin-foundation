import assert from 'node:assert/strict';
import test from 'node:test';
import { assessMuninGuard, formatMuninGuardReport, parseMuninGuardManifest } from '../src/munin-guard.js';

test('Munin Guard passes a pinned licensed low-risk candidate with sufficient evidence', () => {
  const result = assessMuninGuard({
    id: 'demo:safe-agent',
    name: 'Safe Agent',
    kind: 'agent',
    source: 'https://github.com/example/safe-agent',
    pinnedRevision: '4fd1f4120a4fdb8f6dc22bfe7f41ecaf1c26b80a',
    license: 'MIT',
    networkDomains: ['api.example.com'],
    permissions: ['read project files'],
    maintenanceScore: 0.9,
    duplicationScore: 0.1,
    evidence: ['source reviewed', 'license verified', 'revision pinned', 'bounded permissions'],
  });
  assert.equal(result.decision, 'PASS');
  assert.equal(result.risk, 'LOW');
  assert.equal(result.security.state, 'TRUSTED');
  assert.equal(result.benchmark.status, 'promote');
  assert.equal(result.executionPolicy.targetExecutionAllowed, false);
  assert.equal(result.executionPolicy.automaticPromotionAllowed, false);
});

test('Munin Guard blocks an unpinned source before execution', () => {
  const result = assessMuninGuard({
    id: 'demo:unpinned',
    name: 'Unpinned Agent',
    source: 'https://github.com/example/unpinned',
    license: 'MIT',
    maintenanceScore: 0.9,
    evidence: ['source reviewed', 'license verified', 'tests observed', 'owner identified'],
  });
  assert.equal(result.decision, 'BLOCK');
  assert.equal(result.risk, 'HIGH');
  assert.match(result.reasons.join('\n'), /UNPINNED_SOURCE/);
  assert.equal(result.executionPolicy.targetExecutionAllowed, false);
});

test('Munin Guard blocks paid or metered dependencies under zero-cost policy', () => {
  const result = assessMuninGuard({
    id: 'demo:paid',
    name: 'Paid Agent',
    source: 'https://example.com/paid-agent',
    pinnedRevision: 'release-1',
    license: 'MIT',
    recurringCost: 10,
    maintenanceScore: 0.9,
    evidence: ['source reviewed', 'license verified', 'revision pinned', 'pricing verified'],
  });
  assert.equal(result.capability.decision, 'reject');
  assert.equal(result.decision, 'BLOCK');
  assert.match(result.reasons.join('\n'), /zero-additional-cost/);
});

test('Munin Guard parser rejects malformed manifests and formatter exposes policy boundaries', () => {
  assert.throws(() => parseMuninGuardManifest({ name: 'Missing id', source: 'x' }), /requires a non-empty "id"/);
  const result = assessMuninGuard({
    id: 'demo:review',
    name: 'Review Agent',
    source: 'https://example.com/review',
    pinnedRevision: 'release-1',
    license: 'MIT',
    maintenanceScore: 0.5,
    evidence: ['source reviewed'],
  });
  const text = formatMuninGuardReport(result);
  assert.match(text, /Munin Guard v0\.1/);
  assert.match(text, /Target execution: BLOCKED/);
  assert.match(text, /Automatic promotion: BLOCKED/);
});
