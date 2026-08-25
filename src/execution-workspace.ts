import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface WorkspaceCommand {
  command: string;
  args?: string[];
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface WorkspaceCommandResult {
  command: string;
  args: string[];
  cwd: string;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ExecutionWorkspaceInfo {
  id: string;
  repositoryPath: string;
  workspacePath: string;
  baseRef: string;
  isolated: true;
}

export interface ExecutionWorkspace {
  readonly info: ExecutionWorkspaceInfo;
  run(input: WorkspaceCommand): Promise<WorkspaceCommandResult>;
  diff(): Promise<string>;
  dispose(): Promise<void>;
}

export interface GitWorktreeWorkspaceOptions {
  repositoryPath: string;
  baseRef?: string;
  tempRoot?: string;
  commandTimeoutMs?: number;
}

function safeId(): string {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class GitWorktreeExecutionWorkspace implements ExecutionWorkspace {
  private disposed = false;

  private constructor(
    readonly info: ExecutionWorkspaceInfo,
    private readonly commandTimeoutMs: number,
  ) {}

  static async create(options: GitWorktreeWorkspaceOptions): Promise<GitWorktreeExecutionWorkspace> {
    const repositoryPath = resolve(options.repositoryPath);
    const baseRef = options.baseRef ?? 'HEAD';
    const root = resolve(options.tempRoot ?? tmpdir());
    const workspacePath = await mkdtemp(join(root, 'munin-worktree-'));
    const id = safeId();

    try {
      await execFileAsync('git', ['-C', repositoryPath, 'worktree', 'add', '--detach', workspacePath, baseRef], {
        windowsHide: true,
        timeout: options.commandTimeoutMs ?? 120_000,
      });
    } catch (error) {
      await rm(workspacePath, { recursive: true, force: true });
      throw error;
    }

    return new GitWorktreeExecutionWorkspace({ id, repositoryPath, workspacePath, baseRef, isolated: true }, options.commandTimeoutMs ?? 120_000);
  }

  async run(input: WorkspaceCommand): Promise<WorkspaceCommandResult> {
    if (this.disposed) throw new Error('Execution workspace has already been disposed.');
    if (!input.command.trim()) throw new Error('Workspace command is required.');

    const args = input.args ?? [];
    const startedAt = Date.now();
    const { stdout, stderr } = await execFileAsync(input.command, args, {
      cwd: this.info.workspacePath,
      env: input.env ?? process.env,
      windowsHide: true,
      timeout: input.timeoutMs ?? this.commandTimeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      command: input.command,
      args,
      cwd: this.info.workspacePath,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    };
  }

  async diff(): Promise<string> {
    if (this.disposed) throw new Error('Execution workspace has already been disposed.');
    const { stdout } = await execFileAsync('git', ['-C', this.info.workspacePath, 'diff', '--no-ext-diff', '--binary'], {
      windowsHide: true,
      timeout: this.commandTimeoutMs,
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    try {
      await execFileAsync('git', ['-C', this.info.repositoryPath, 'worktree', 'remove', '--force', this.info.workspacePath], {
        windowsHide: true,
        timeout: this.commandTimeoutMs,
      });
    } finally {
      await rm(this.info.workspacePath, { recursive: true, force: true });
    }
  }
}
