import assert from 'node:assert/strict';
import test from 'node:test';
import { HostBridgeExecutor, type HostExecutionAdapter } from '../src/host-bridge-executor.js';
import { parseGitHubHostIntent } from '../src/github-host-inbox.js';
import { validateHostJob } from '../src/host-bridge-protocol.js';

class FakeHostAdapter implements HostExecutionAdapter {
  objectives: string[] = [];
  async runtimeHealth() { return 'healthy'; }
  async gitFastForward() { return 'updated'; }
  async deployMain() { return 'deployed'; }
  async restartMunin() { return 'restarted'; }
  async runAcceptance() { return 'accepted'; }
  async tailscaleHealth() { return 'tailscale'; }
  async buildAll(objective: string) { this.objectives.push(objective); return `built:${objective}`; }
}

test('BUILD ALL host jobs require an explicit bounded objective and approved repo context', () => {
  const base = { id: 'build-1', type: 'build-all' as const, repo: 'MuninHQ/munin-foundation' as const, branch: 'main' as const, createdAt: new Date().toISOString() };
  assert.equal(validateHostJob({ ...base, objective: 'implement feature' }).status, 'approved');
  assert.equal(validateHostJob(base).status, 'blocked');
  assert.equal(validateHostJob({ ...base, objective: 'x'.repeat(2001) }).status, 'blocked');
});

test('HostBridgeExecutor dispatches the validated objective to BUILD ALL', async () => {
  const adapter = new FakeHostAdapter();
  const result = await new HostBridgeExecutor(adapter).execute({
    id: 'build-2',
    type: 'build-all',
    repo: 'MuninHQ/munin-foundation',
    branch: 'main',
    objective: 'ship safe parallel change',
    createdAt: new Date().toISOString(),
  });
  assert.equal(result.status, 'completed');
  assert.deepEqual(adapter.objectives, ['ship safe parallel change']);
  assert.match(result.evidence?.[0] ?? '', /built:ship safe parallel change/);
});

test('GitHub Host Inbox accepts BUILD ALL intent and preserves objective', () => {
  const now = Date.now();
  const intent = parseGitHubHostIntent({
    version: 1,
    id: 'remote-build',
    type: 'build-all',
    repo: 'MuninHQ/munin-foundation',
    branch: 'main',
    objective: 'implement remote feature',
    createdAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
  }, now);
  assert.equal(intent.type, 'build-all');
  assert.equal(intent.objective, 'implement remote feature');
});

test('GitHub Host Inbox rejects BUILD ALL intent without objective', () => {
  const now = Date.now();
  assert.throws(() => parseGitHubHostIntent({
    version: 1,
    id: 'remote-build-bad',
    type: 'build-all',
    repo: 'MuninHQ/munin-foundation',
    branch: 'main',
    createdAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
  }, now), /requires objective/i);
});
