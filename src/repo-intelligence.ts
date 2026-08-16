import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type RepoIntelligenceSource = 'native' | 'rag-rat' | 'graphify';
export type RepoEvidence = { source: RepoIntelligenceSource; path?: string; symbol?: string; rationale?: string; confidence?: number };
export type RepoImpact = { query: string; files: string[]; symbols: string[]; tests: string[]; evidence: RepoEvidence[]; coverage: 'partial' | 'indexed' | 'unknown'; raw?: string };
export type RepoProviderHealth = { source: RepoIntelligenceSource; available: boolean; detail?: string };

type Runner = (file: string, args: string[], cwd: string) => Promise<{ ok: boolean; stdout: string; stderr: string }>;

async function defaultRunner(file: string, args: string[], cwd: string) {
  try {
    const result = await execFileAsync(file, args, { cwd, timeout: 20_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    return { ok: true, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
  } catch (error: any) {
    return { ok: false, stdout: String(error?.stdout ?? ''), stderr: String(error?.stderr ?? error?.message ?? error) };
  }
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}

function lines(value: string) {
  return [...new Set(value.split(/\r?\n/).map(x => x.trim()).filter(Boolean))];
}

function queryTokens(query: string) {
  const stop = new Set(['the','and','for','with','from','into','that','this','build','implement','change','update','fix','munin']);
  return [...new Set(query.toLowerCase().match(/[a-z0-9_-]{3,}/g) ?? [])].filter(x => !stop.has(x)).slice(0, 8);
}

function parseRagRat(query: string, raw: string): RepoImpact {
  try {
    const value = JSON.parse(raw) as any;
    const files = strings(value.files ?? value.paths ?? value.impacted_files);
    const symbols = strings(value.symbols ?? value.impacted_symbols);
    const tests = strings(value.tests ?? value.test_files);
    return { query, files, symbols, tests, evidence: [{ source: 'rag-rat', rationale: value.rationale, confidence: typeof value.confidence === 'number' ? value.confidence : undefined }], coverage: 'indexed', raw };
  } catch {
    return { query, files: [], symbols: [], tests: [], evidence: [{ source: 'rag-rat' }], coverage: 'indexed', raw };
  }
}

export class RepoIntelligenceProvider {
  constructor(private readonly repo = process.cwd(), private readonly run: Runner = defaultRunner) {}

  async health(): Promise<RepoProviderHealth[]> {
    const rag = await this.run(process.platform === 'win32' ? 'rag-rat.exe' : 'rag-rat', ['doctor'], this.repo);
    const graph = await this.run(process.platform === 'win32' ? 'graphify.exe' : 'graphify', ['--version'], this.repo);
    return [
      { source: 'rag-rat', available: rag.ok, detail: (rag.stdout || rag.stderr).trim().slice(0, 300) },
      { source: 'graphify', available: graph.ok, detail: (graph.stdout || graph.stderr).trim().slice(0, 300) },
      { source: 'native', available: true, detail: 'Git/source inspection fallback' },
    ];
  }

  private async nativeImpact(query: string): Promise<RepoImpact> {
    const tokens = queryTokens(query);
    const listed = await this.run('git', ['ls-files'], this.repo);
    if (!listed.ok) return { query, files: [], symbols: [], tests: [], evidence: [{ source: 'native', rationale: 'Git file listing unavailable.' }], coverage: 'unknown' };
    const tracked = lines(listed.stdout).filter(file => !/(^|\/)(node_modules|dist|coverage|data\/runtime)(\/|$)/.test(file));
    const pathScores = new Map<string, number>();
    for (const file of tracked) {
      const lower = file.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (lower.includes(token) ? 2 : 0), 0);
      if (score) pathScores.set(file, score);
    }
    let contentMatches: string[] = [];
    if (tokens.length) {
      const args = ['grep', '-Il'];
      for (const token of tokens) args.push('-e', token);
      args.push('--');
      const grep = await this.run('git', args, this.repo);
      if (grep.ok) contentMatches = lines(grep.stdout);
    }
    const contentSet = new Set(contentMatches);
    const ranked = [...new Set([...pathScores.keys(), ...contentMatches])]
      .map(file => ({ file, score: (pathScores.get(file) ?? 0) + (contentSet.has(file) ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
      .slice(0, 30);
    const files = ranked.map(x => x.file);
    const directTests = tracked.filter(file => /(^|\/)(tests?|__tests__)(\/|$)|\.(?:test|spec)\.[^.]+$/i.test(file));
    const stems = new Set(files.map(file => file.split('/').pop()?.replace(/\.(?:ts|tsx|js|mjs|cjs)$/i, '').replace(/\.(?:test|spec)$/i, '')).filter(Boolean) as string[]);
    const tests = directTests.filter(file => {
      const lower = file.toLowerCase();
      return tokens.some(token => lower.includes(token)) || [...stems].some(stem => stem.length > 3 && lower.includes(stem.toLowerCase()));
    }).slice(0, 20);
    let history = '';
    if (files.length) {
      const log = await this.run('git', ['log', '-n', '8', '--pretty=format:%h %s', '--', ...files.slice(0, 8)], this.repo);
      if (log.ok) history = log.stdout.trim().slice(0, 1800);
    }
    const evidence: RepoEvidence[] = ranked.slice(0, 10).map(item => ({
      source: 'native',
      path: item.file,
      confidence: Math.min(0.85, 0.35 + item.score * 0.1),
      rationale: `${pathScores.has(item.file) ? 'query matched path' : ''}${pathScores.has(item.file) && contentSet.has(item.file) ? ' + ' : ''}${contentSet.has(item.file) ? 'query matched tracked content' : ''}` || 'tracked repository match',
    }));
    if (history) evidence.push({ source: 'native', rationale: `Recent history for candidate files:\n${history}`, confidence: 0.7 });
    return { query, files, symbols: [], tests, evidence: evidence.length ? evidence : [{ source: 'native', rationale: 'No deterministic repository matches found for this objective.', confidence: 0.2 }], coverage: files.length ? 'partial' : 'unknown' };
  }

  async impact(query: string): Promise<RepoImpact> {
    const rag = await this.run(process.platform === 'win32' ? 'rag-rat.exe' : 'rag-rat', ['impact-surface', query, '--json'], this.repo);
    if (rag.ok && rag.stdout.trim()) return parseRagRat(query, rag.stdout.trim());
    return this.nativeImpact(query);
  }
}
