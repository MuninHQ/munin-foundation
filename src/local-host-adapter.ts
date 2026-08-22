import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import type { HostExecutionAdapter } from './host-bridge-executor.js';

const execFileAsync = promisify(execFile);

export interface LocalHostAdapterOptions {
  cwd?: string;
  apiUrl?: string;
  webUrl?: string;
  timeoutMs?: number;
  supervisorStatePath?: string;
  restartRequestPath?: string;
}

async function runFixed(command: string, args: string[], cwd: string, timeoutMs: number): Promise<string> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd,
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
    shell: false,
  });
  return `${stdout ?? ''}${stderr ? `\n${stderr}` : ''}`.trim();
}

function npmInvocation(): { command: string; args: string[] } {
  if (process.platform !== 'win32') return { command: 'npm', args: [] };
  const cli = process.env.npm_execpath?.trim();
  if (!cli || !isAbsolute(cli) || basename(cli).toLowerCase() !== 'npm-cli.js') {
    throw new Error('Windows npm CLI path is unavailable; refusing shell fallback.');
  }
  return { command: process.execPath, args: [cli] };
}

async function cleanGeneratedArtifacts(cwd: string, timeoutMs: number): Promise<void> {
  await rm(resolve(cwd, 'dist'), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await runFixed('git', ['restore', '--worktree', '--', 'dist-web'], cwd, timeoutMs);
  await runFixed('git', ['clean', '-fd', '--', 'dist-web'], cwd, timeoutMs);
}

export class LocalHostAdapter implements HostExecutionAdapter {
  private readonly cwd: string;
  private readonly apiUrl: string;
  private readonly webUrl: string;
  private readonly timeoutMs: number;
  private readonly supervisorStatePath: string;
  private readonly restartRequestPath: string;

  constructor(options: LocalHostAdapterOptions = {}) {
    this.cwd = resolve(options.cwd ?? process.cwd());
    this.apiUrl = options.apiUrl ?? 'http://127.0.0.1:4310';
    this.webUrl = options.webUrl ?? 'http://127.0.0.1:5173';
    this.timeoutMs = Math.max(1000, Math.min(60000, options.timeoutMs ?? 15000));
    const dataDir = resolve(process.env.MUNIN_DATA_DIR ?? resolve(this.cwd, 'data/runtime'));
    this.supervisorStatePath = resolve(options.supervisorStatePath ?? resolve(dataDir, 'workspace-supervisor.json'));
    this.restartRequestPath = resolve(options.restartRequestPath ?? resolve(dataDir, 'workspace-restart-request.json'));
  }

  async runtimeHealth(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/api/health`, { signal: AbortSignal.timeout(Math.min(this.timeoutMs, 5000)) });
    if (!response.ok) throw new Error(`Munin API health returned HTTP ${response.status}.`);
    const api = await response.text();
    let web = 'unavailable';
    try {
      const webResponse = await fetch(this.webUrl, { signal: AbortSignal.timeout(Math.min(this.timeoutMs, 5000)) });
      web = `HTTP ${webResponse.status}`;
    } catch {}
    return `API ${response.status}: ${api.slice(0, 2000)}\nWEB: ${web}`;
  }

  async gitFastForward(): Promise<string> {
    await runFixed('git', ['fetch', 'origin', 'main'], this.cwd, this.timeoutMs);
    const status = await runFixed('git', ['status', '--porcelain'], this.cwd, this.timeoutMs);
    if (status.trim()) throw new Error('Working tree is not clean; refusing automatic fast-forward.');
    const branch = await runFixed('git', ['branch', '--show-current'], this.cwd, this.timeoutMs);
    if (branch.trim() !== 'main') throw new Error(`Current branch is ${branch.trim() || 'detached'}; refusing automatic main update.`);
    const output = await runFixed('git', ['merge', '--ff-only', 'origin/main'], this.cwd, this.timeoutMs);
    return output || 'main already up to date.';
  }

  async deployMain(): Promise<string> {
    const update = await this.gitFastForward();
    const npm = npmInvocation();
    await cleanGeneratedArtifacts(this.cwd, this.timeoutMs);
    let verification: string;
    try {
      verification = await runFixed(npm.command, [...npm.args, 'test'], this.cwd, Math.max(this.timeoutMs, 240000));
    } finally {
      await cleanGeneratedArtifacts(this.cwd, this.timeoutMs);
    }
    const restart = await this.restartMunin();
    let health = 'Health will be rechecked by the resident host worker.';
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 2500));
      try { health = await this.runtimeHealth(); break; } catch {}
    }
    return `UPDATE\n${update}\nVERIFY\n${verification.slice(-4000)}\nRESTART\n${restart}\nHEALTH\n${health}`;
  }

  async restartMunin(): Promise<string> {
    let state: { status?: string; heartbeatAt?: string; pid?: number };
    try { state = JSON.parse(await readFile(this.supervisorStatePath, 'utf8')); }
    catch { throw new Error('Workspace supervisor is unavailable; refusing restart.'); }
    const heartbeat = Date.parse(state.heartbeatAt ?? '');
    if (state.status !== 'running' || !Number.isFinite(heartbeat) || Date.now() - heartbeat > 15000) throw new Error('Workspace supervisor heartbeat is stale; refusing restart.');
    const id = `restart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request = { kind: 'restart-munin', id, requestedAt: new Date().toISOString(), supervisorPid: state.pid };
    await mkdir(dirname(this.restartRequestPath), { recursive: true });
    const tmp = `${this.restartRequestPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(request, null, 2) + '\n', 'utf8');
    await rename(tmp, this.restartRequestPath);
    return `Controlled Munin restart requested through workspace supervisor (${id}).`;
  }

  async runAcceptance(): Promise<string> {
    if (process.platform !== 'win32') throw new Error('ChatGPT-first host acceptance runner currently requires Windows PowerShell.');
    const script = resolve(this.cwd, 'scripts', 'acceptance-chatgpt-first.ps1');
    return runFixed('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-ApiUrl', this.apiUrl, '-WebUrl', this.webUrl], this.cwd, this.timeoutMs);
  }

  async tailscaleHealth(): Promise<string> {
    return runFixed('tailscale', ['status', '--json'], this.cwd, this.timeoutMs);
  }
}
