import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type SandboxStrength = 'hard' | 'guarded';

export interface SandboxCommand {
  command: string;
  args?: string[];
  cwd: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface SandboxCommandResult {
  stdout: string;
  stderr: string;
  durationMs: number;
  backend: string;
  strength: SandboxStrength;
}

export interface ExecutionSandboxStatus {
  backend: string;
  strength: SandboxStrength;
  available: boolean;
  detail: string;
}

export interface ExecutionSandbox {
  readonly status: ExecutionSandboxStatus;
  run(input: SandboxCommand): Promise<SandboxCommandResult>;
}

const SAFE_NATIVE_EXECUTABLES = new Set(['node', 'node.exe', 'npm', 'npm.cmd', 'npx', 'npx.cmd', 'git', 'git.exe']);
const FORBIDDEN_ENV = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|AUTHORIZATION|CREDENTIAL|ACCESS_KEY|CLIENT_SECRET|REFRESH_TOKEN|SESSION_KEY)$/i;

function sanitizedEnv(input?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const source = input ?? process.env;
  const output: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || FORBIDDEN_ENV.test(key)) continue;
    output[key] = value;
  }
  return output;
}

function executableName(command: string): string {
  return path.basename(command).toLowerCase();
}

function containerExecutable(command: string): string {
  const name = executableName(command);
  if (name === 'node.exe') return 'node';
  if (name === 'npm.cmd') return 'npm';
  if (name === 'npx.cmd') return 'npx';
  if (name === 'git.exe') return 'git';
  return name;
}

export interface NativeInvocationOptions {
  platform?: NodeJS.Platform;
  execPath?: string;
  npmExecPath?: string;
  exists?: (candidate: string) => boolean;
}

export function resolveNativeInvocation(command: string, args: string[] = [], options: NativeInvocationOptions = {}): { command: string; args: string[] } {
  const platform = options.platform ?? process.platform;
  const name = executableName(command);
  if (platform !== 'win32' || !['npm', 'npm.cmd', 'npx', 'npx.cmd'].includes(name)) return { command, args };
  const cliName = name.startsWith('npx') ? 'npx-cli.js' : 'npm-cli.js';
  const execPath = options.execPath ?? process.execPath;
  const npmExecPath = options.npmExecPath ?? process.env.npm_execpath;
  const candidates = [
    npmExecPath ? path.join(path.dirname(npmExecPath), cliName) : undefined,
    path.isAbsolute(command) ? path.join(path.dirname(command), 'node_modules', 'npm', 'bin', cliName) : undefined,
    path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', cliName),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const exists = options.exists ?? existsSync;
  const cliPath = candidates.find(exists);
  if (!cliPath) throw new Error(`Sandbox cannot resolve ${name} safely on Windows: ${cliName} is unavailable.`);
  return { command: execPath, args: [cliPath, ...args] };
}

export class NativeGuardedSandbox implements ExecutionSandbox {
  readonly status: ExecutionSandboxStatus = {
    backend: 'native-guarded',
    strength: 'guarded',
    available: true,
    detail: 'Allowlisted execFile boundary with secret-stripped environment. It is not an OS/container sandbox.',
  };

  async run(input: SandboxCommand): Promise<SandboxCommandResult> {
    const name = executableName(input.command);
    if (!SAFE_NATIVE_EXECUTABLES.has(name)) throw new Error(`Sandbox blocked executable: ${name || input.command}`);
    const invocation = resolveNativeInvocation(input.command, input.args ?? []);
    const startedAt = Date.now();
    const { stdout, stderr } = await execFileAsync(invocation.command, invocation.args, {
      cwd: input.cwd,
      timeout: input.timeoutMs ?? 120_000,
      env: sanitizedEnv(input.env),
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, durationMs: Date.now() - startedAt, backend: this.status.backend, strength: this.status.strength };
  }
}

export interface DockerSandboxOptions {
  image?: string;
  memoryMb?: number;
  cpus?: number;
  pidsLimit?: number;
}

export class DockerHardSandbox implements ExecutionSandbox {
  readonly status: ExecutionSandboxStatus;
  private constructor(private readonly options: Required<DockerSandboxOptions>) {
    this.status = {
      backend: 'docker',
      strength: 'hard',
      available: true,
      detail: `Container isolation using ${options.image}; network disabled, capabilities dropped, read-only root filesystem.`,
    };
  }

  static async detect(options: DockerSandboxOptions = {}): Promise<DockerHardSandbox | undefined> {
    try {
      await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 5_000, windowsHide: true });
      return new DockerHardSandbox({
        image: options.image ?? process.env.MUNIN_SANDBOX_IMAGE ?? 'node:22-bookworm-slim',
        memoryMb: options.memoryMb ?? 1024,
        cpus: options.cpus ?? 2,
        pidsLimit: options.pidsLimit ?? 256,
      });
    } catch {
      return undefined;
    }
  }

  async run(input: SandboxCommand): Promise<SandboxCommandResult> {
    const executable = containerExecutable(input.command);
    if (!SAFE_NATIVE_EXECUTABLES.has(executable) && !['node', 'npm', 'npx', 'git'].includes(executable)) {
      throw new Error(`Sandbox blocked executable: ${executable || input.command}`);
    }
    const env = sanitizedEnv(input.env);
    const dockerArgs = [
      'run', '--rm', '--network', 'none', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
      '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=256m', '--pids-limit', String(this.options.pidsLimit),
      '--memory', `${this.options.memoryMb}m`, '--cpus', String(this.options.cpus),
      '--mount', `type=bind,src=${path.resolve(input.cwd)},dst=/workspace`, '--workdir', '/workspace',
    ];
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined && ['CI', 'NODE_ENV', 'TZ'].includes(key)) dockerArgs.push('--env', `${key}=${value}`);
    }
    dockerArgs.push(this.options.image, executable, ...(input.args ?? []));
    const startedAt = Date.now();
    const { stdout, stderr } = await execFileAsync('docker', dockerArgs, {
      timeout: input.timeoutMs ?? 120_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, durationMs: Date.now() - startedAt, backend: this.status.backend, strength: this.status.strength };
  }
}

export interface ResolveSandboxOptions extends DockerSandboxOptions {
  policy?: 'auto' | 'strict' | 'guarded';
}

export async function resolveExecutionSandbox(options: ResolveSandboxOptions = {}): Promise<ExecutionSandbox> {
  const configured = process.env.MUNIN_EXECUTION_SANDBOX;
  const policy = options.policy ?? (configured === 'strict' ? 'strict' : configured === 'auto' ? 'auto' : 'guarded');
  if (policy !== 'guarded') {
    const docker = await DockerHardSandbox.detect(options);
    if (docker) return docker;
    if (policy === 'strict') throw new Error('Strict execution sandbox requested but Docker isolation is unavailable.');
  }
  return new NativeGuardedSandbox();
}

export async function executionSandboxStatus(): Promise<ExecutionSandboxStatus> {
  const now = Date.now();
  if (sandboxStatusCache && sandboxStatusCache.expiresAt > now) return sandboxStatusCache.value;
  const value = DockerHardSandbox.detect().then(docker => docker?.status ?? new NativeGuardedSandbox().status);
  sandboxStatusCache = { expiresAt: now + 60_000, value };
  return value;
}

let sandboxStatusCache: { expiresAt: number; value: Promise<ExecutionSandboxStatus> } | undefined;
