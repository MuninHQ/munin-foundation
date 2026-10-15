import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { applyContextBudget, type ContextBudget, type ContextCandidate, type ContextSelection } from './context-budget.js';

const executeFile = promisify(execFile);

export type RepositoryDiscoveryKind = 'git-status' | 'git-files' | 'git-log' | 'rg';
export interface RepositoryDiscoveryCommand { kind: RepositoryDiscoveryKind; root: string; objective: string; }
export interface RepositoryDiscoveryOutput { ok: boolean; lines: string[]; error?: string; }
export interface RepositoryContextDependencies {
  readText(path: string): Promise<string>;
  run(command: RepositoryDiscoveryCommand): Promise<RepositoryDiscoveryOutput>;
  isTracked(path: string, root: string): Promise<boolean>;
}
export interface RepositoryContextInput { root: string; objective: string; budget: ContextBudget; explicitPaths?: string[]; }
export interface RepositoryContextResult {
  selection: ContextSelection;
  discovery: Array<{ kind: RepositoryDiscoveryKind; ok: boolean; detail: string }>;
  broadReadRefused: boolean;
  degraded: boolean;
  diagnostics: string[];
}

function outputLines(value: string): string[] {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

async function defaultRun(command: RepositoryDiscoveryCommand): Promise<RepositoryDiscoveryOutput> {
  try {
    if (command.kind === 'git-status') {
      const { stdout } = await executeFile('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: command.root, windowsHide: true, maxBuffer: 2_000_000 });
      return { ok: true, lines: outputLines(stdout).map(line => line.slice(3).split(' -> ').at(-1) ?? '').filter(Boolean) };
    }
    const terms = command.objective.match(/[\p{L}\p{N}_-]{3,}/gu)?.slice(0, 6) ?? [];
    if (!terms.length) return { ok: true, lines: [] };
    const { stdout } = await executeFile('rg', ['-n', '--no-heading', '--color', 'never', '-g', '!node_modules', '-g', '!dist', '-g', '!dist-web', terms.join('|'), '.'], { cwd: command.root, windowsHide: true, maxBuffer: 2_000_000 });
    return { ok: true, lines: outputLines(stdout) };
  } catch (error) {
    const detail = error as NodeJS.ErrnoException & { stdout?: string };
    if (detail.code === '1' && command.kind === 'rg') return { ok: true, lines: [] };
    return { ok: false, lines: [], error: detail.message };
  }
}

const defaultDependencies: RepositoryContextDependencies = {
  readText: file => readFile(file, 'utf8'),
  run: defaultRun,
  isTracked: async (file, root) => {
    try {
      await executeFile('git', ['ls-files', '--error-unmatch', '--', file], { cwd: root, windowsHide: true });
      return true;
    } catch { return false; }
  },
};

function safeRelative(root: string, candidate: string): string | undefined {
  const cleaned = candidate.replace(/^\.\//, '').replace(/\\/g, '/');
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, cleaned);
  const relative = path.relative(resolvedRoot, resolved).replace(/\\/g, '/');
  return relative && !relative.startsWith('../') && !path.isAbsolute(relative) ? relative : undefined;
}

function rgPath(line: string): string | undefined {
  const match = line.match(/^(.*?):\d+:/);
  return match?.[1];
}

export class RepositoryContextSelector {
  constructor(private readonly dependencies: RepositoryContextDependencies = defaultDependencies) {}

  async select(input: RepositoryContextInput): Promise<RepositoryContextResult> {
    const discovery: RepositoryContextResult['discovery'] = [];
    const diagnostics: string[] = [];
    const evidence = new Map<string, Set<string>>();
    const score = new Map<string, number>();
    const remember = (candidate: string, reason: string, points: number) => {
      const relative = safeRelative(input.root, candidate);
      if (!relative) { diagnostics.push(`Rejected path outside repository: ${candidate}`); return; }
      const reasons = evidence.get(relative) ?? new Set<string>();
      reasons.add(reason);
      evidence.set(relative, reasons);
      score.set(relative, Math.max(score.get(relative) ?? 0, points));
    };

    for (const explicit of input.explicitPaths ?? []) remember(explicit, 'explicit', 100);
    const status = await this.dependencies.run({ kind: 'git-status', root: input.root, objective: input.objective });
    discovery.push({ kind: 'git-status', ok: status.ok, detail: status.ok ? `${status.lines.length} changed paths` : status.error ?? 'unavailable' });
    if (!status.ok) diagnostics.push(`Git status unavailable: ${status.error ?? 'unknown error'}`);
    for (const candidate of status.lines) remember(candidate, 'git:changed', 80);

    const search = await this.dependencies.run({ kind: 'rg', root: input.root, objective: input.objective });
    discovery.push({ kind: 'rg', ok: search.ok, detail: search.ok ? `${search.lines.length} matches` : search.error ?? 'unavailable' });
    if (!search.ok) diagnostics.push(`Repository search unavailable: ${search.error ?? 'unknown error'}`);
    for (const line of search.lines) {
      const candidate = rgPath(line);
      if (candidate) remember(candidate, `rg:${line.slice(0, 240)}`, 90);
    }

    const candidates: ContextCandidate[] = [];
    for (const [relative, reasons] of evidence) {
      if (!(await this.dependencies.isTracked(relative, input.root)) && !reasons.has('git:changed') && !reasons.has('explicit')) continue;
      try {
        let content = await this.dependencies.readText(path.resolve(input.root, relative));
        if (content.includes('\0')) {
          candidates.push({ path: relative, content: '', evidence: [...reasons], score: score.get(relative), binary: true });
          continue;
        }
        if (content.length > input.budget.maxFileChars) content = content.slice(0, input.budget.maxFileChars);
        candidates.push({ path: relative, content, evidence: [...reasons], score: score.get(relative) });
      } catch (error) {
        diagnostics.push(`Could not read ${relative}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      selection: applyContextBudget(candidates, input.budget),
      discovery,
      broadReadRefused: true,
      degraded: discovery.some(item => !item.ok),
      diagnostics,
    };
  }
}
