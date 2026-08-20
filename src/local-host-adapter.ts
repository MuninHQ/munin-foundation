import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import type { HostExecutionAdapter } from './host-bridge-executor.js';

const execFileAsync = promisify(execFile);

export interface LocalHostAdapterOptions {
  cwd?: string;
  apiUrl?: string;
  webUrl?: string;
  timeoutMs?: number;
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

export class LocalHostAdapter implements HostExecutionAdapter {
  private readonly cwd: string;
  private readonly apiUrl: string;
  private readonly webUrl: string;
  private readonly timeoutMs: number;

  constructor(options: LocalHostAdapterOptions = {}) {
    this.cwd = resolve(options.cwd ?? process.cwd());
    this.apiUrl = options.apiUrl ?? 'http://127.0.0.1:4310';
    this.webUrl = options.webUrl ?? 'http://127.0.0.1:5173';
    this.timeoutMs = Math.max(1000, Math.min(60000, options.timeoutMs ?? 15000));
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

  async restartMunin(): Promise<string> {
    throw new Error('restart-munin is intentionally unavailable until Munin has a stable supervised service boundary.');
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
