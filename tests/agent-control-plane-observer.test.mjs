import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectProfile, runObserver } from '../scripts/agent-control-plane-observer.mjs';

const policy = {
  mode: 'observe',
  requiredProfileFields: ['id', 'role', 'authorizedActions', 'forbiddenActions', 'trustedInstructionSources', 'untrustedContentSources', 'completionEvidence', 'escalationTriggers', 'memoryPolicy', 'toolPolicy'],
  canonicalActionClasses: ['read', 'local-write', 'git-write', 'network-read', 'external-write', 'destructive'],
  consequentialActionClasses: ['external-write', 'destructive'],
  requiredForbiddenActions: ['external-write', 'destructive', 'credential-access', 'permission-escalation'],
  requiredUntrustedSources: ['web', 'email', 'user-upload', 'third-party-api', 'tool-result', 'external-prompt-repository'],
  requiredEscalationTriggers: ['destructive-action', 'external-write', 'credential-access', 'privilege-elevation', 'trusted-instruction-conflict', 'high-impact-ambiguity', 'verification-bypass', 'prompt-injection-suspected'],
  forbiddenAuthorityPatterns: ['bypass-approval', 'disable-audit', 'auto-promote-memory', 'auto-promote-skill', 'unrestricted-credential-access', 'permission-escalation']
};
const healthy = {
  id: 'fixture-worker',
  role: 'Test bounded observation behavior.',
  authorizedActions: ['read', 'network-read', 'local-write'],
  forbiddenActions: ['external-write', 'destructive', 'credential-access', 'permission-escalation'],
  trustedInstructionSources: ['munin-constitution', 'user-current-task', 'agent-contract'],
  untrustedContentSources: ['web', 'email', 'user-upload', 'third-party-api', 'tool-result', 'external-prompt-repository'],
  completionEvidence: ['artifact-produced'],
  escalationTriggers: ['destructive-action', 'external-write', 'credential-access', 'privilege-elevation', 'trusted-instruction-conflict', 'high-impact-ambiguity', 'verification-bypass', 'prompt-injection-suspected'],
  memoryPolicy: { durablePromotion: 'review-required', skillPromotion: 'promotion-gate-required' },
  toolPolicy: { availabilityDoesNotImplyAuthority: true, consequentialActionsUseExistingMuninGate: true }
};

test('bounded fixture has no policy drift', () => {
  assert.deepEqual(inspectProfile(policy, healthy, 'research-worker.json'), []);
});

test('observer detects authority and promotion drift without enforcing it', () => {
  const unsafe = structuredClone(healthy);
  unsafe.authorizedActions.push('external-write');
  unsafe.untrustedContentSources = unsafe.untrustedContentSources.filter((source) => source !== 'tool-result');
  unsafe.escalationTriggers = unsafe.escalationTriggers.filter((trigger) => trigger !== 'prompt-injection-suspected');
  unsafe.memoryPolicy.durablePromotion = 'automatic';
  unsafe.toolPolicy.availabilityDoesNotImplyAuthority = false;

  const codes = inspectProfile(policy, unsafe, 'unsafe.json').map((finding) => finding.code);
  assert.ok(codes.includes('consequential-action-authorized'));
  assert.ok(codes.includes('untrusted-source-not-declared'));
  assert.ok(codes.includes('missing-escalation-trigger'));
  assert.ok(codes.includes('automatic-durable-memory-promotion'));
  assert.ok(codes.includes('tool-authority-boundary-not-explicit'));
});

test('observer detects trust overlap and disabled consequential-action gate', () => {
  const unsafe = structuredClone(healthy);
  unsafe.trustedInstructionSources.push('web');
  unsafe.toolPolicy.consequentialActionsUseExistingMuninGate = false;

  const codes = inspectProfile(policy, unsafe, 'unsafe.json').map((finding) => finding.code);
  assert.ok(codes.includes('source-both-trusted-and-untrusted'));
  assert.ok(codes.includes('consequential-action-gate-not-required'));
});

test('observer detects missing nested memory policy and forbidden action boundaries', () => {
  const unsafe = structuredClone(healthy);
  unsafe.memoryPolicy = {};
  unsafe.forbiddenActions = [];

  const codes = inspectProfile(policy, unsafe, 'unsafe.json').map((finding) => finding.code);
  assert.ok(codes.includes('durable-memory-promotion-policy-missing'));
  assert.ok(codes.includes('skill-promotion-policy-missing'));
  assert.ok(codes.includes('required-forbidden-action-missing'));
});

test('repository profiles can be observed together', async () => {
  const report = await runObserver();
  assert.equal(report.mode, 'observe');
  assert.equal(report.profiles, 3);
  assert.equal(typeof report.findings, 'number');
  assert.ok(Array.isArray(report.results));
});
