import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import net from 'node:net';

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
  console.log('[Munin] Loaded local configuration from .env');
}

loadLocalEnv();

const API_PORT = Number(process.env.MUNIN_API_PORT ?? 4310);
const WEB_PORT = Number(process.env.MUNIN_WEB_PORT ?? 5173);
const START_PAGE = process.env.MUNIN_START_PAGE ?? '';
const BROWSER_MODE = process.env.MUNIN_BROWSER_MODE ?? 'browser';

const children = [];
let shuttingDown = false;

function run(command, args, label) {
  const child = spawn(command, args, { stdio: 'inherit', shell: platform() === 'win32', env: process.env });
  children.push(child);
  child.on('exit', code => {
    if (!shuttingDown && code && code !== 0) console.error(`[Munin] ${label} exited with code ${code}. Other services will remain available.`);
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
    socket.once('connect', () => done(true)); socket.once('timeout', () => done(false)); socket.once('error', () => done(false));
  });
}

async function apiHealthy() {
  try {
    const response = await fetch(`http://127.0.0.1:${API_PORT}/api/health`, { signal: AbortSignal.timeout(1200) });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.status === 'ok' && data?.service === 'munin-workspace';
  } catch { return false; }
}

async function waitFor(check, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) { if (await check()) return true; await new Promise(resolve => setTimeout(resolve, 250)); }
  return false;
}

function openUi(url) {
  if (platform() === 'win32' && (BROWSER_MODE === 'app' || BROWSER_MODE === 'kiosk')) {
    const edgeArgs = BROWSER_MODE === 'kiosk' ? `--kiosk ${url} --edge-kiosk-type=fullscreen` : `--app=${url}`;
    const child = spawn('powershell', ['-NoProfile', '-Command', `Start-Process msedge.exe -ArgumentList '${edgeArgs}'`], { stdio: 'ignore', detached: true });
    child.unref();
    return;
  }
  const target = platform() === 'win32' ? ['cmd', ['/c', 'start', '', url]] : platform() === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = spawn(target[0], target[1], { stdio: 'ignore', detached: true }); child.unref();
}

function shutdown(code = 0) { shuttingDown = true; for (const child of children) if (!child.killed) child.kill('SIGTERM'); process.exit(code); }
process.on('SIGINT', () => shutdown(0)); process.on('SIGTERM', () => shutdown(0));

console.log('Starting Munin Workspace...');
if (await apiHealthy()) {
  console.log(`[Munin] Healthy API already running on 127.0.0.1:${API_PORT}; reusing it.`);
} else {
  if (await portOpen(API_PORT)) {
    console.error(`[Munin] Port ${API_PORT} is occupied by a process that is not a healthy Munin API.`);
    console.error('[Munin] Stop that process before starting Munin. Refusing to reuse a stale/foreign service.');
    process.exit(1);
  }
  await runToCompletion('npm', ['run', 'build:core'], 'TypeScript build');
  run('node', ['dist/src/server.js'], 'Munin API');
  if (!(await waitFor(apiHealthy))) console.error(`[Munin] API did not become healthy on port ${API_PORT}.`);
}

if (await portOpen(WEB_PORT)) console.log(`[Munin] Web UI already running at http://127.0.0.1:${WEB_PORT}; reusing it.`);
else run('npm', ['run', 'web', '--', '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], 'Web UI');

const ready = await waitFor(() => portOpen(WEB_PORT));
if (ready) {
  const page = START_PAGE ? `/${START_PAGE.replace(/^\//, '')}` : '/';
  const url = `http://127.0.0.1:${WEB_PORT}${page}`;
  console.log(`[Munin] Workspace ready: ${url}`);
  openUi(url);
} else {
  console.error(`[Munin] Web UI did not become ready on port ${WEB_PORT}. Check the messages above.`);
  process.exitCode = 1;
}
