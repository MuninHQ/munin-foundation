import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import net from 'node:net';

const children = [];
let shuttingDown = false;

function run(command, args, label) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: platform() === 'win32',
    env: process.env,
  });
  children.push(child);
  child.on('exit', code => {
    if (!shuttingDown && code && code !== 0) {
      console.error(`[Munin] ${label} exited with code ${code}. Other services will remain available.`);
    }
  });
  return child;
}

function portOpen(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = net.createConnection({ port, host });
    const done = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await portOpen(port)) return true;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

function openBrowser(url) {
  const target = platform() === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : platform() === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  const child = spawn(target[0], target[1], { stdio: 'ignore', detached: true });
  child.unref();
}

async function startService({ port, command, args, label }) {
  if (await portOpen(port)) {
    console.log(`[Munin] ${label} already running on 127.0.0.1:${port}; reusing it.`);
    return;
  }
  run(command, args, label);
}

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting Munin Workspace...');
await startService({ port: 4310, command: 'npm', args: ['run', 'api'], label: 'Core API' });
await startService({ port: 4312, command: 'npm', args: ['run', 'visual-assets-api'], label: 'Visual Assets API' });
await startService({ port: 4313, command: 'npm', args: ['run', 'linkedin-composer-api'], label: 'LinkedIn Composer API' });
await startService({ port: 4314, command: 'npm', args: ['run', 'context-memory-api'], label: 'Context Memory API' });

if (await portOpen(5173)) {
  console.log('[Munin] Web UI already running at http://127.0.0.1:5173; reusing it.');
} else {
  run('npm', ['run', 'web', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], 'Web UI');
}

const ready = await waitForPort(5173);
if (ready) {
  console.log('[Munin] Workspace ready: http://127.0.0.1:5173');
  openBrowser('http://127.0.0.1:5173');
} else {
  console.error('[Munin] Web UI did not become ready on port 5173. Check the messages above.');
  process.exitCode = 1;
}
