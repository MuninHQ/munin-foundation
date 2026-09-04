import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

export interface WaveCommitDelivery {
  taskId: string;
  commit?: string;
  summary: string;
}

export interface GitWaveReconcileResult {
  status: 'completed' | 'failed';
  baseRef: string;
  head?: string;
  applied: Array<{ taskId: string; commit: string }>;
  noChangeTaskIds: string[];
  blocker?: string;
  evidence: string[];
}

export interface GitWaveSession {
  branch: string;
  worktree: string;
  baseRef: string;
}

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

function slug(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'build-all';
}

export class GitWaveReconciler {
  constructor(private readonly repo = process.cwd()) {}

  async start(objective: string, baseRef = 'main'): Promise<GitWaveSession> {
    const top = await run('git', ['rev-parse', '--show-toplevel'], this.repo, 20_000);
    if (!top.ok) throw new Error(`Git repository unavailable: ${top.stderr}`);
    const root = top.stdout.trim();
    const verify = await run('git', ['rev-parse', '--verify', baseRef], root, 20_000);
    if (!verify.ok) throw new Error(`Base ref is unavailable: ${baseRef}`);

    const id = randomUUID().slice(0, 8);
    const branch = `buildall/integration-${slug(objective)}-${id.slice(0, 4)}`;
    const worktree = path.join(os.tmpdir(), 'munin-build-all', id);
    await fs.mkdir(path.dirname(worktree), { recursive: true });
    const add = await run('git', ['worktree', 'add', '-b', branch, worktree, baseRef], root, 60_000);
    if (!add.ok) throw new Error(`Unable to create integration worktree: ${add.stderr}`);
    return { branch, worktree, baseRef };
  }

  async reconcile(session: GitWaveSession, deliveries: WaveCommitDelivery[]): Promise<GitWaveReconcileResult> {
    const applied: Array<{ taskId: string; commit: string }> = [];
    const noChangeTaskIds: string[] = [];
    const evidence: string[] = [];
    const before = await run('git', ['rev-parse', 'HEAD'], session.worktree, 20_000);
    if (!before.ok) {
      return { status: 'failed', baseRef: session.baseRef, applied, noChangeTaskIds, evidence, blocker: before.stderr };
    }

    for (const delivery of deliveries) {
      if (!delivery.commit?.trim()) {
        noChangeTaskIds.push(delivery.taskId);
        evidence.push(`${delivery.taskId}:no-change`);
        continue;
      }

      const verify = await run('git', ['cat-file', '-e', `${delivery.commit}^{commit}`], session.worktree, 20_000);
      if (!verify.ok) {
        await this.rollback(session, before.stdout.trim());
        return {
          status: 'failed',
          baseRef: session.baseRef,
          applied: [],
          noChangeTaskIds,
          evidence,
          blocker: `Task ${delivery.taskId} produced unknown commit ${delivery.commit}.`,
        };
      }

      const pick = await run('git', ['cherry-pick', delivery.commit], session.worktree, 60_000);
      if (!pick.ok) {
        await run('git', ['cherry-pick', '--abort'], session.worktree, 20_000);
        await this.rollback(session, before.stdout.trim());
        return {
          status: 'failed',
          baseRef: session.baseRef,
          applied: [],
          noChangeTaskIds,
          evidence,
          blocker: `Wave reconciliation conflict at task ${delivery.taskId}: ${pick.stderr || pick.stdout}`.slice(0, 4000),
        };
      }

      applied.push({ taskId: delivery.taskId, commit: delivery.commit });
      evidence.push(`${delivery.taskId}:${delivery.commit}`);
    }

    const head = await run('git', ['rev-parse', 'HEAD'], session.worktree, 20_000);
    if (!head.ok) {
      await this.rollback(session, before.stdout.trim());
      return { status: 'failed', baseRef: session.baseRef, applied: [], noChangeTaskIds, evidence, blocker: head.stderr };
    }

    return {
      status: 'completed',
      baseRef: session.baseRef,
      head: head.stdout.trim(),
      applied,
      noChangeTaskIds,
      evidence,
    };
  }

  async dispose(session: GitWaveSession): Promise<void> {
    const top = await run('git', ['rev-parse', '--show-toplevel'], this.repo, 20_000);
    if (top.ok) await run('git', ['worktree', 'remove', '--force', session.worktree], top.stdout.trim(), 60_000);
  }

  private async rollback(session: GitWaveSession, sha: string): Promise<void> {
    await run('git', ['reset', '--hard', sha], session.worktree, 20_000);
    await run('git', ['clean', '-fd'], session.worktree, 20_000);
  }
}
