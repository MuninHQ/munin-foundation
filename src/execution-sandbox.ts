import { execFile } from 'node:child_process';
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
const FORBIDDEN_ENV = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|AUTHORIZATION)$/i;
const SHELL_META = /[|;&<>`\r\n]/;

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
    const args = input.args ?? [];
    if (args.some(arg => SHELL_META.test(arg))) throw new Error('Sandbox blocked shell metacharacters in command arguments.');
    const startedAt = Date.now();
    const { stdout, stderr } = await execFileAsync(input.command, args, {
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
    const args = input.args ?? [];
    if (args.some(arg => SHELL_META.test(arg))) throw new Error('Sandbox blocked shell metacharacters in command arguments.');
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
    dockerArgs.push(this.options.image, input.command, ...args);
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
  const policy = options.policy ?? (process.env.MUNIN_EXECUTION_SANDBOX === 'strict' ? 'strict' : process.env.MUNIN_EXECUTION_SANDBOX === 'guarded' ? 'guarded' : 'auto');
  if (policy !== 'guarded') {
    const docker = await DockerHardSandbox.detect(options);
    if (docker) return docker;
    if (policy === 'strict') throw new Error('Strict execution sandbox requested but Docker isolation is unavailable.');
  }
  return new NativeGuardedSandbox();
}

export async function executionSandboxStatus(): Promise<ExecutionSandboxStatus> {
  const docker = await DockerHardSandbox.detect();
  return docker?.status ?? new NativeGuardedSandbox().status;
}
