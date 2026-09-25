import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EngineeringAgentRuntime, type EngineeringResult } from './engineering-runtime.js';
import type { ParallelAgentTask } from './parallel-agent-waves.js';
import type { BaseAwareEngineeringResult, BaseAwareEngineeringRuntime } from './reconciled-wave-engineering.js';

const execFileAsync = promisify(execFile);

export interface EngineeringRuntimeLike {
  execute(objective: string): Promise<EngineeringResult>;
}

export type EngineeringRuntimeFactory = (repo: string) => EngineeringRuntimeLike;

async function run(file: string, args: string[], cwd: string, timeout = 60_000) {
  try {
    const result = await execFileAsync(file, args, { cwd, timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    return { ok: true, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
  } catch (error: any) {
    return {
      ok: false,
      stdout: String(error?.stdout ?? ''),
      stderr: String(error?.stderr ?? error?.message ?? error),
    };
  }
}

function safeRefComponent(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'task';
}

function mapResult(result: EngineeringResult): BaseAwareEngineeringResult {
  if (result.status === 'needs_user') {
    return {
      status: 'blocked',
      summary: result.message,
      blocker: result.message,
      changedFiles: result.changedFiles,
      evidence: result.events.flatMap(item => item.evidence ? [item.evidence] : []),
    };
  }
  if (result.status === 'failed') {
    return {
      status: 'failed',
      summary: result.message,
      changedFiles: result.changedFiles,
      evidence: result.events.flatMap(item => item.evidence ? [item.evidence] : []),
    };
  }
  return {
    status: 'completed',
    summary: result.message,
    commit: result.commit,
    changedFiles: result.changedFiles,
    evidence: [
      result.commit,
      result.branch,
      result.validation,
      ...result.events.flatMap(item => item.evidence ? [item.evidence] : []),
    ].filter((item): item is string => Boolean(item)),
  };
}

export class BaseAwareEngineeringAgentAdapter implements BaseAwareEngineeringRuntime {
  constructor(
    private readonly repo = process.cwd(),
    private readonly runtimeFactory: EngineeringRuntimeFactory = root => new EngineeringAgentRuntime(root),
  ) {}

  async execute(task: ParallelAgentTask, baseRef: string): Promise<BaseAwareEngineeringResult> {
    const top = await run('git', ['rev-parse', '--show-toplevel'], this.repo, 20_000);
    if (!top.ok) return { status: 'blocked', summary: 'Git repository unavailable.', blocker: top.stderr };
    const root = top.stdout.trim();
    const resolved = await run('git', ['rev-parse', '--verify', baseRef], root, 20_000);
    if (!resolved.ok) return { status: 'failed', summary: `Base ref unavailable: ${baseRef}` };

    const id = randomUUID().slice(0, 8);
    const sandbox = path.join(os.tmpdir(), 'munin-base-aware-engineering', id);
    let runtimeWorktree: string | undefined;
    try {
      await fs.mkdir(path.dirname(sandbox), { recursive: true });
      const clone = await run('git', ['clone', '--shared', '--no-checkout', root, sandbox], root, 120_000);
      if (!clone.ok) return { status: 'failed', summary: `Unable to create task sandbox: ${clone.stderr}` };

      const baseSha = resolved.stdout.trim();
      const update = await run('git', ['update-ref', 'refs/heads/main', baseSha], sandbox, 20_000);
      if (!update.ok) return { status: 'failed', summary: `Unable to pin task base: ${update.stderr}` };
      const checkout = await run('git', ['switch', 'main'], sandbox, 30_000);
      if (!checkout.ok) return { status: 'failed', summary: `Unable to checkout task base: ${checkout.stderr}` };

      await run('git', ['remote', 'set-url', '--push', 'origin', `file://${path.join(sandbox, 'push-disabled.git').replaceAll('\\', '/')}`], sandbox, 20_000);
      await this.attachDependencies(root, sandbox);

      const result = await this.runtimeFactory(sandbox).execute(task.objective);
      runtimeWorktree = result.worktree;
      const mapped = mapResult(result);
      if (mapped.status !== 'completed' || !mapped.commit) return mapped;

      const ref = `refs/munin-wave/${safeRefComponent(task.id)}-${id}`;
      const imported = await run('git', ['fetch', sandbox, `${mapped.commit}:${ref}`], root, 60_000);
      if (!imported.ok) {
        return {
          status: 'failed',
          summary: `Task ${task.id} completed but its commit could not be imported for reconciliation: ${imported.stderr}`,
          changedFiles: mapped.changedFiles,
          evidence: mapped.evidence,
        };
      }

      const importedSha = await run('git', ['rev-parse', ref], root, 20_000);
      if (!importedSha.ok) return { status: 'failed', summary: `Imported task ref is unreadable: ${ref}` };
      return { ...mapped, commit: importedSha.stdout.trim(), evidence: [...(mapped.evidence ?? []), `base:${baseSha}`, `imported-ref:${ref}`] };
    } finally {
      if (runtimeWorktree) await fs.rm(runtimeWorktree, { recursive: true, force: true }).catch(() => undefined);
      await fs.rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async attachDependencies(sourceRoot: string, sandbox: string): Promise<void> {
    const source = path.join(sourceRoot, 'node_modules');
    const target = path.join(sandbox, 'node_modules');
    try {
      const stat = await fs.stat(source);
      if (!stat.isDirectory()) return;
      await fs.symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir');
    } catch {
      // Dependency reuse is an optimization; EngineeringAgentRuntime can install in its isolated worktree if needed.
    }
  }
}
