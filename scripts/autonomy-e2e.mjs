#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const local = process.argv.includes('--local');

const checks = [
  { id: 'build', label: 'Core + web build', cmd: ['npm', ['run', 'build']], required: true },
  { id: 'tests', label: 'Full regression suite', cmd: ['node', ['--test', '--test-reporter=spec', 'dist/tests/*.test.js']], shell: true, required: true },
  { id: 'second-brain', label: 'Second Brain status', cmd: ['npm', ['run', 'second-brain:status']], required: true },
  { id: 'autonomy', label: 'Autonomy readiness doctor', cmd: ['npm', ['run', 'autonomy:doctor']], required: true },
  { id: 'control-room', label: 'Control Room state', cmd: ['npm', ['run', 'control-room:state']], required: true },
  { id: 'sitrep', label: 'Operator SITREP', cmd: ['npm', ['run', 'operator:sitrep']], required: true },
  { id: 'browser-local', label: 'Local browser validation', cmd: ['npm', ['run', 'browser:validate-local']], required: local, localOnly: true },
  { id: 'video-local', label: 'Local video benchmark', cmd: ['npm', ['run', 'video:benchmark']], required: local, localOnly: true },
];

const results = [];

function run(check) {
  if (check.localOnly && !local) {
    results.push({ ...check, status: 'DEFERRED', code: null });
    console.log(`\n[DEFERRED] ${check.label} — requires --local / powered-on host`);
    return;
  }

  const [command, args] = check.cmd;
  console.log(`\n[RUN] ${check.label}`);
  const outcome = spawnSync(command, args, {
    stdio: 'inherit',
    shell: check.shell ?? process.platform === 'win32',
    env: process.env,
  });

  const code = outcome.status ?? 1;
  results.push({ ...check, status: code === 0 ? 'PASS' : 'FAIL', code });
}

for (const check of checks) run(check);

const failedRequired = results.filter((r) => r.required && r.status === 'FAIL');
const deferred = results.filter((r) => r.status === 'DEFERRED');

console.log('\n=== MUNIN AUTONOMY E2E READINESS ===');
for (const result of results) {
  console.log(`${result.status.padEnd(8)} ${result.label}`);
}

if (deferred.length) {
  console.log(`\n${deferred.length} local-only check(s) deferred. Re-run with: node scripts/autonomy-e2e.mjs --local`);
}

if (failedRequired.length) {
  console.error(`\nFAIL: ${failedRequired.length} required gate(s) failed.`);
  process.exit(1);
}

console.log(local
  ? '\nPASS: cloud-safe and local readiness gates completed. This does not auto-publish content or execute destructive actions.'
  : '\nPASS: cloud-safe readiness gates completed. Local host/browser/video checks remain intentionally deferred.');
