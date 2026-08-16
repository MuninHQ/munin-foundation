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

  async impact(query: string): Promise<RepoImpact> {
    const rag = await this.run(process.platform === 'win32' ? 'rag-rat.exe' : 'rag-rat', ['impact-surface', query, '--json'], this.repo);
    if (rag.ok && rag.stdout.trim()) return parseRagRat(query, rag.stdout.trim());
    return { query, files: [], symbols: [], tests: [], evidence: [{ source: 'native', rationale: 'Optional repository index unavailable; use Git/source inspection.' }], coverage: 'unknown' };
  }
}
