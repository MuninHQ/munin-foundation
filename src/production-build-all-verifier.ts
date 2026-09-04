import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BuildAllPlan, BuildAllVerificationResult } from './build-all-wave-runtime.js';

const execFileAsync = promisify(execFile);

export interface ProductionBuildAllVerificationContext {
  objective: string;
  plan: BuildAllPlan;
  integrationHead: string;
}

export interface ProductionBuildAllVerifierLike {
  verify(context: ProductionBuildAllVerificationContext): Promise<BuildAllVerificationResult>;
}

export interface VerificationCommandRunner {
  run(file: string, args: string[], cwd: string, timeout?: number): Promise<{ ok: boolean; stdout: string; stderr: string }>;
}

class DefaultCommandRunner implements VerificationCommandRunner {
  async run(file: string, args: string[], cwd: string, timeout = 300_000) {
    try {
      const result = await execFileAsync(file, args, { cwd, timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
      return { ok: true, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
    } catch (error: any) {
      return {
        ok: false,
        stdout: String(error?.stdout ?? ''),
        stderr: String(error?.stderr ?? error?.message ?? error),
      };
    }
  }
}

function clip(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(-1800);
}

export class GitProductionBuildAllVerifier implements ProductionBuildAllVerifierLike {
  constructor(
    private readonly repo = process.cwd(),
    private readonly commands: VerificationCommandRunner = new DefaultCommandRunner(),
  ) {}

  async verify(context: ProductionBuildAllVerificationContext): Promise<BuildAllVerificationResult> {
    const top = await this.commands.run('git', ['rev-parse', '--show-toplevel'], this.repo, 20_000);
    if (!top.ok) return { status: 'BLOCKED', summary: 'Final verification cannot access the Git repository.', blocker: clip(top.stderr) };
    const root = top.stdout.trim();
    const resolved = await this.commands.run('git', ['rev-parse', '--verify', context.integrationHead], root, 20_000);
    if (!resolved.ok) return { status: 'FAILED', summary: `Integrated BUILD ALL head is unavailable: ${context.integrationHead}` };

    const id = randomUUID().slice(0, 8);
    const worktree = path.join(os.tmpdir(), 'munin-build-all-verify', id);
    const evidence: string[] = [`integration-head:${resolved.stdout.trim()}`];
    let added = false;
    try {
      await fs.mkdir(path.dirname(worktree), { recursive: true });
      const add = await this.commands.run('git', ['worktree', 'add', '--detach', worktree, resolved.stdout.trim()], root, 60_000);
      if (!add.ok) return { status: 'FAILED', summary: 'Unable to create independent verification worktree.', blocker: clip(add.stderr) };
      added = true;
      await this.attachDependencies(root, worktree);

      const commands: Array<{ label: string; file: string; args: string[] }> = [
        { label: 'build:core', file: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', 'build:core'] },
        { label: 'build:web', file: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', 'build:web'] },
        { label: 'tests', file: 'node', args: ['--test', '--test-reporter=spec', 'dist/tests/*.test.js'] },
      ];

      for (const command of commands) {
        const result = await this.commands.run(command.file, command.args, worktree, 300_000);
        if (!result.ok) {
          return {
            status: 'FAILED',
            summary: `Independent final verification failed at ${command.label}.`,
            evidence,
            blocker: clip(`${result.stdout}\n${result.stderr}`),
          };
        }
        evidence.push(`${command.label}:passed`);
      }

      evidence.push(`criteria:${context.plan.completionCriteria.length}`);
      evidence.push(`tasks:${context.plan.tasks.length}`);
      return {
        status: 'PASS',
        summary: `Independent final verification passed for ${context.plan.tasks.length} task(s) and ${context.plan.completionCriteria.length} completion criterion/criteria.`,
        evidence,
      };
    } finally {
      if (added) await this.commands.run('git', ['worktree', 'remove', '--force', worktree], root, 60_000);
      await fs.rm(worktree, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async attachDependencies(root: string, worktree: string): Promise<void> {
    const source = path.join(root, 'node_modules');
    const target = path.join(worktree, 'node_modules');
    try {
      const stat = await fs.stat(source);
      if (!stat.isDirectory()) return;
      await fs.symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir');
    } catch {
      // Missing dependency reuse is surfaced by the build command, not hidden here.
    }
  }
}
