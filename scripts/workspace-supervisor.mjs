import { spawn } from 'node:child_process';
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dataDir = resolve(process.env.MUNIN_DATA_DIR ?? 'data/runtime');
const lockPath = resolve(dataDir, 'workspace-supervisor.lock');
const statePath = resolve(dataDir, 'workspace-supervisor.json');
const launcher = resolve(root, 'scripts', 'launch.mjs');
const restartExitCode = 75;

await mkdir(dataDir, { recursive: true });
let lock;
try {
  lock = await open(lockPath, 'wx');
} catch (error) {
  if (error?.code === 'EEXIST') {
    console.error('[Munin] Workspace supervisor already appears to be running.');
    process.exit(2);
  }
  throw error;
}

let child;
let stopping = false;
let heartbeat;

async function persistState(extra = {}) {
  await writeFile(statePath, JSON.stringify({ pid: process.pid, childPid: child?.pid, startedAt, heartbeatAt: new Date().toISOString(), ...extra }, null, 2) + '\n', 'utf8');
}

const startedAt = new Date().toISOString();

function startWorkspace() {
  child = spawn(process.execPath, [launcher], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, MUNIN_SUPERVISED: '1' },
  });
  void persistState({ status: 'running' });
  child.once('exit', async code => {
    if (stopping) return;
    if (code === restartExitCode) {
      console.log('[Munin] Supervisor received controlled restart completion; relaunching workspace.');
      await new Promise(resolveDelay => setTimeout(resolveDelay, 300));
      startWorkspace();
      return;
    }
    console.error(`[Munin] Workspace exited with code ${code ?? 'null'}; supervisor is stopping instead of looping.`);
    stopping = true;
    await persistState({ status: 'stopped', exitCode: code ?? null });
    await cleanup();
    process.exitCode = code ?? 1;
  });
}

async function cleanup() {
  clearInterval(heartbeat);
  try { await lock?.close(); } catch {}
  try { await rm(lockPath, { force: true }); } catch {}
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeat);
  if (child && !child.killed) child.kill('SIGTERM');
  await persistState({ status: 'stopping' });
  await cleanup();
}

process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));

try {
  const stale = JSON.parse(await readFile(statePath, 'utf8'));
  if (stale?.pid && stale.pid !== process.pid) console.log(`[Munin] Replacing stale supervisor state from PID ${stale.pid}.`);
} catch {}

startWorkspace();
heartbeat = setInterval(() => { void persistState({ status: 'running' }); }, 5000);
await persistState({ status: 'running' });
