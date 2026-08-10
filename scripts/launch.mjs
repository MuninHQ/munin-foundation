import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import net from 'node:net';

const API_PORT = Number(process.env.MUNIN_API_PORT ?? 4310);
const WEB_PORT = Number(process.env.MUNIN_WEB_PORT ?? 5173);

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

function runToCompletion(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: platform() === 'win32', env: process.env });
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${label} failed with code ${code}`))));
    child.on('error', reject);
  });
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

// One unified API process serves every module (core, visual assets, composer,
// context memory, executive briefing) on a single port. TypeScript is compiled
// once here instead of once per service, which is what previously made startup
// slow (5 sequential tsc runs through npm).
if (await portOpen(API_PORT)) {
  console.log(`[Munin] API already running on 127.0.0.1:${API_PORT}; reusing it.`);
} else {
  await runToCompletion('npm', ['run', 'build:core'], 'TypeScript build');
  run('node', ['dist/src/server.js'], 'Munin API');
  if (!(await waitForPort(API_PORT))) {
    console.error(`[Munin] API did not become ready on port ${API_PORT}.`);
  }
}

if (await portOpen(WEB_PORT)) {
  console.log(`[Munin] Web UI already running at http://127.0.0.1:${WEB_PORT}; reusing it.`);
} else {
  run('npm', ['run', 'web', '--', '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], 'Web UI');
}

const ready = await waitForPort(WEB_PORT);
if (ready) {
  console.log(`[Munin] Workspace ready: http://127.0.0.1:${WEB_PORT}`);
  openBrowser(`http://127.0.0.1:${WEB_PORT}`);
} else {
  console.error(`[Munin] Web UI did not become ready on port ${WEB_PORT}. Check the messages above.`);
  process.exitCode = 1;
}
