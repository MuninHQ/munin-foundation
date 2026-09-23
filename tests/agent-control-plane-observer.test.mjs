import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { inspectProfile, runObserver } from '../scripts/agent-control-plane-observer.mjs';

const policy = JSON.parse(await readFile(new URL('../agent-control-plane/policy.json', import.meta.url), 'utf8'));
const healthy = JSON.parse(await readFile(new URL('../agent-control-plane/profiles/research-worker.json', import.meta.url), 'utf8'));

test('canonical research profile has no policy drift', () => {
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

test('repository profiles can be observed together', async () => {
  const report = await runObserver();
  assert.equal(report.mode, 'observe');
  assert.equal(report.profiles, 3);
  assert.equal(report.findings, 0);
});
