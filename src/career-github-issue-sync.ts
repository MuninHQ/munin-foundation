import { ingestCareerItem } from './career-intake.js';
import { parseCareerGitHubIssue, type GitHubCareerIssue } from './career-github-contract.js';
import { MemoryLedger } from './memory-ledger.js';
import { ContextStore } from './store.js';

const REPO = 'MuninHQ/munin-core'; // Private transport; never write real vacancies to munin-foundation.
export interface CareerGitHubSyncOptions {
  token?: string;
  fetcher?: typeof fetch;
  store?: ContextStore;
  ledger?: MemoryLedger;
  maxPages?: number;
}
export interface CareerGitHubSyncResult {
  source: string;
  scanned: number;
  added: number;
  updated: number;
  skipped: number;
}
/** Read-only GitHub transport. Application submissions are never authorized by this sync. */
export async function syncCareerGitHubIssues(options: CareerGitHubSyncOptions = {}): Promise<CareerGitHubSyncResult> {
  const token = options.token ?? process.env.MUNIN_CAREER_GITHUB_TOKEN;
  if (!token?.trim()) throw new Error('Career GitHub sync is disabled: missing MUNIN_CAREER_GITHUB_TOKEN.');
  const fetcher = options.fetcher ?? fetch;
  const store = options.store ?? new ContextStore();
  const ledger = options.ledger ?? new MemoryLedger();
  const maxPages = Math.max(1, Math.min(10, Math.floor(options.maxPages ?? 3)));
  const result: CareerGitHubSyncResult = { source: REPO, scanned: 0, added: 0, updated: 0, skipped: 0 };

  for (let page = 1; page <= maxPages; page++) {
    const endpoint = `https://api.github.com/repos/${REPO}/issues?state=all&per_page=100&sort=updated&direction=desc&page=${page}`;
    const response = await fetcher(endpoint, {
      headers: { Authorization: `Bearer ${token.trim()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Career GitHub sync could not read the private inbox (HTTP ${response.status}).`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('Career GitHub inbox returned an unexpected response.');
    for (const raw of payload) {
      result.scanned++;
      const item = parseCareerGitHubIssue(raw as GitHubCareerIssue);
      if (!item) { result.skipped++; continue; }
      // GitHub is an input transport; ContextStore remains the single source of truth.
      const previous = (await store.load()).jobs.find(job => job.link === item.url);
      if (item.decision === 'discarded') {
        if (previous && (previous.status === 'discovered' || previous.status === 'investigating')) {
          const state = await store.load();
          const job = state.jobs.find(job => job.id === previous.id);
          if (job) {
            job.status = 'closed'; job.closedReason = 'Descartada após revisão humana no GitHub';
            job.nextAction = 'Nenhuma candidatura pendente.'; job.updatedAt = new Date().toISOString();
            await store.save(state);
            await store.event('job.career.github-decision', 'job', job.id, { issueNumber: item.issueNumber, decision: item.decision });
            result.updated++;
          }
        } else result.skipped++;
        continue;
      }
      const intake = await ingestCareerItem({
        source: 'share_sheet', url: item.url, company: item.company, role: item.role,
        text: [item.role, item.company, item.analysis ?? ''].filter(Boolean).join('\n'),
        metadata: { transport: 'github-issues', issueNumber: item.issueNumber, decision: item.decision },
      }, { store, ledger });
      if (intake.added) result.added++;
      if (item.decision === 'approved') {
        const state = await store.load();
        const job = state.jobs.find(candidate => candidate.id === intake.job.id);
        if (job?.status === 'discovered') {
          job.status = 'investigating';
          job.nextAction = 'Preparar candidatura; envio exige confirmação humana.';
          job.updatedAt = new Date().toISOString();
          await store.save(state);
          await store.event('job.career.github-decision', 'job', job.id, { issueNumber: item.issueNumber, decision: 'approved' });
          result.updated++;
        }
      } else if (!intake.added) result.skipped++;
    }
    if (payload.length < 100) break;
  }
  return result;
}
