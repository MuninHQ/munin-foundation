import type { CapabilityCandidate } from './capability-radar.js';

export interface GitHubRepositorySnapshot {
  full_name: string;
  html_url: string;
  description: string | null;
  archived: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  pushed_at: string;
  updated_at: string;
  license?: { spdx_id?: string | null } | null;
}

export interface GitHubDiscoveryOptions {
  query: string;
  limit?: number;
  fetcher?: typeof fetch;
}

export interface DiscoveredCapability {
  candidate: CapabilityCandidate;
  repository: GitHubRepositorySnapshot;
  evidence: string[];
}

function maintenanceScore(repo: GitHubRepositorySnapshot): number {
  const ageDays = Math.max(0, (Date.now() - Date.parse(repo.updated_at)) / 86_400_000);
  if (repo.archived) return 0;
  if (ageDays <= 90) return 1;
  if (ageDays <= 365) return 0.75;
  if (ageDays <= 730) return 0.4;
  return 0.15;
}

function securityScore(repo: GitHubRepositorySnapshot): number {
  if (repo.archived) return 0;
  const license = repo.license?.spdx_id?.trim();
  const licenseEvidence = license && license !== 'NOASSERTION' ? 0.45 : 0.15;
  const maintenanceEvidence = maintenanceScore(repo) * 0.35;
  const adoptionEvidence = Math.min(0.2, Math.log10(Math.max(1, repo.stargazers_count)) / 20);
  return Number(Math.min(1, licenseEvidence + maintenanceEvidence + adoptionEvidence).toFixed(3));
}

export async function discoverGitHubCapabilities(options: GitHubDiscoveryOptions): Promise<DiscoveredCapability[]> {
  const query = options.query.trim();
  if (!query) throw new Error('GitHub capability discovery query is required.');
  const limit = Math.max(1, Math.min(10, options.limit ?? 5));
  const fetcher = options.fetcher ?? fetch;
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q', query);
  url.searchParams.set('sort', 'stars');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(limit));
  const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'munin-zero-cost-capability-radar' }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`GitHub discovery failed with HTTP ${response.status}.`);
  const payload = await response.json() as { items?: GitHubRepositorySnapshot[] };
  const items = Array.isArray(payload.items) ? payload.items.slice(0, limit) : [];
  return items.map(repository => {
    const maintenance = maintenanceScore(repository);
    const security = securityScore(repository);
    const license = repository.license?.spdx_id?.trim();
    const evidence = [
      `GitHub repository: ${repository.full_name}`,
      `License: ${license || 'unknown'}`,
      `Archived: ${repository.archived}`,
      `Stars: ${repository.stargazers_count}`,
      `Forks: ${repository.forks_count}`,
      `Created: ${repository.created_at}`,
      `Pushed: ${repository.pushed_at}`,
      `Open issues: ${repository.open_issues_count}`,
      `Updated: ${repository.updated_at}`,
    ];
    const candidate: CapabilityCandidate = {
      id: `github:${repository.full_name.toLowerCase()}`,
      name: repository.full_name,
      source: repository.html_url,
      license: license && license !== 'NOASSERTION' ? license : undefined,
      recurringCost: 0,
      metered: false,
      paidApiRequired: false,
      maintenanceScore: maintenance,
      securityScore: security,
      duplicationScore: 0,
      github: {
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        createdAt: repository.created_at,
        pushedAt: repository.pushed_at,
        archived: repository.archived,
      },
      evidence,
    };
    return { candidate, repository, evidence };
  });
}
