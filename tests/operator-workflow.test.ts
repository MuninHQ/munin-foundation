import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnoseOperatorWorkflow, runOperatorWorkflow, type ProcessRunner } from '../src/operator-workflow.js';

function fakeRunner(responses: Record<string, { code?: number; stdout?: string; stderr?: string }> = {}) {
  const calls: string[] = [];
  const runner: ProcessRunner = async (command, args) => {
    const key = `${command} ${args.join(' ')}`;
    calls.push(key);
    const response = responses[key] ?? { code: 0, stdout: '' };
    return { code: response.code ?? 0, stdout: response.stdout ?? '', stderr: response.stderr ?? '' };
  };
  return { calls, runner };
}

test('doctor checks the fixed tool and repository boundary without mutating it', async () => {
  const { calls, runner } = fakeRunner({
    'git remote get-url origin': { stdout: 'https://github.com/MuninHQ/munin-foundation.git' },
  });
  const checks = await diagnoseOperatorWorkflow(runner);
  assert.equal(checks.find(check => check.name === 'Munin origin')?.status, 'ok');
  assert.ok(calls.some(call => call.includes('git status')) === false);
  assert.ok(calls.every(call => !/push|commit|merge|reset|clean/.test(call)));
});

test('doctor reports missing GitHub CLI because ship depends on it', async () => {
  const { runner } = fakeRunner({
    'gh --version': { code: 1, stderr: 'missing' },
    'git remote get-url origin': { stdout: 'https://github.com/MuninHQ/munin-foundation.git' },
  });
  const result = await runOperatorWorkflow('doctor', runner);
  assert.equal(result.status, 'attention');
  assert.equal(result.checks?.find(check => check.name === 'GitHub CLI')?.required, true);
});

test('build and verify map to deterministic package gates', async () => {
  const { calls, runner } = fakeRunner();
  await runOperatorWorkflow('build', runner);
  await runOperatorWorkflow('verify', runner);
  assert.ok(calls.some(call => /npm(?:\.cmd)? run build$/.test(call)));
  assert.ok(calls.some(call => /npm(?:\.cmd)? test$/.test(call)));
});

test('ship refuses main and never pushes or opens a pull request', async () => {
  const { calls, runner } = fakeRunner({ 'git branch --show-current': { stdout: 'main' } });
  await assert.rejects(runOperatorWorkflow('ship', runner), /refuses the default branch/);
  assert.ok(calls.every(call => !/push|pr create/.test(call)));
});

test('ship refuses uncommitted changes instead of staging everything', async () => {
  const { calls, runner } = fakeRunner({
    'git branch --show-current': { stdout: 'feat/operator-workflow' },
    'git status --porcelain': { stdout: ' M src/cli.ts' },
  });
  await assert.rejects(runOperatorWorkflow('ship', runner), /requires committed changes/);
  assert.ok(calls.every(call => !/git add|push|pr create/.test(call)));
});

test('ship verifies, pushes and reuses one open mission pull request', async () => {
  const { calls, runner } = fakeRunner({
    'git branch --show-current': { stdout: 'feat/operator-workflow' },
    'git status --porcelain': { stdout: '' },
    'gh pr list --head feat/operator-workflow --state open --json url --limit 1': { stdout: '[{"url":"https://github.com/MuninHQ/munin-foundation/pull/300"}]' },
  });
  const result = await runOperatorWorkflow('ship', runner);
  assert.equal(result.pullRequestUrl, 'https://github.com/MuninHQ/munin-foundation/pull/300');
  assert.ok(calls.some(call => /npm(?:\.cmd)? test$/.test(call)));
  assert.ok(calls.includes('git push --set-upstream origin feat/operator-workflow'));
  assert.ok(calls.every(call => !/pr create/.test(call)));
});

test('ship creates a draft PR only when the mission has none', async () => {
  const { calls, runner } = fakeRunner({
    'git branch --show-current': { stdout: 'feat/operator-workflow' },
    'git status --porcelain': { stdout: '' },
    'gh pr list --head feat/operator-workflow --state open --json url --limit 1': { stdout: '[]' },
    'gh pr create --draft --base main --head feat/operator-workflow --title feat: operator workflow --body Automated Munin mission PR. Verification: `npm test`. Merge remains human-controlled.': { stdout: 'https://github.com/MuninHQ/munin-foundation/pull/301' },
  });
  const result = await runOperatorWorkflow('ship', runner);
  assert.equal(result.pullRequestUrl, 'https://github.com/MuninHQ/munin-foundation/pull/301');
  assert.ok(calls.some(call => call.includes('gh pr create --draft')));
});
