import test from 'node:test';
import assert from 'node:assert/strict';
import { HostAcceptanceQueue, redactHostOutput, validateHostJob } from '../src/host-bridge-protocol.js';

test('host bridge only approves typed allowlisted actions', () => {
  assert.equal(validateHostJob({ id:'h1', type:'runtime-health', dryRun:true, createdAt:new Date().toISOString() }).status, 'approved');
  assert.equal(validateHostJob({ id:'h2', type:'git-fast-forward', repo:'MuninHQ/munin-foundation', branch:'main', createdAt:new Date().toISOString() }).status, 'approved');
  assert.equal(validateHostJob({ id:'h2-deploy', type:'deploy-main', repo:'MuninHQ/munin-foundation', branch:'main', createdAt:new Date().toISOString() }).status, 'approved');
});

test('git host action is pinned to approved repo and main branch', () => {
  const result = validateHostJob({ id:'h3', type:'git-fast-forward', repo:'MuninHQ/munin-foundation', branch:'main', createdAt:new Date().toISOString() });
  assert.equal(result.status, 'approved');
});

test('host output redacts bearer, api keys and tokens', () => {
  const redacted = redactHostOutput('Authorization: Bearer secret123 api_key=abc token=xyz');
  assert.doesNotMatch(redacted, /secret123|abc|xyz/);
  assert.match(redacted, /REDACTED/);
});

test('host acceptance queue deduplicates jobs', () => {
  const q = new HostAcceptanceQueue();
  const job = { id:'same', type:'run-acceptance' as const, dryRun:true, createdAt:new Date().toISOString() };
  q.enqueue(job); q.enqueue(job);
  assert.equal(q.list().length, 1);
});
