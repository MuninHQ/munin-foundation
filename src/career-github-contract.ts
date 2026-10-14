/** Private GitHub Issues are a transport queue, never the canonical Career store. */
export const CAREER_ISSUE_MARKER = '<!-- munin-career-intake:v1 -->';
export type CareerReviewDecision = 'review' | 'approved' | 'discarded';
export interface GitHubCareerIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  pull_request?: unknown;
}
export interface CareerIssueItem {
  issueNumber: number;
  issueUrl: string;
  url: string;
  company: string;
  role: string;
  decision: CareerReviewDecision;
  analysis?: string;
}
function field(body: string, name: string): string {
  // Anchored fields: free-form issue text cannot become an execution command.
  return body.split(/\r?\n/)
    .find(line => line.startsWith(`**${name}:**`))
    ?.slice(name.length + 5).trim() ?? '';
}
export function parseCareerGitHubIssue(issue: GitHubCareerIssue): CareerIssueItem | undefined {
  if (issue.pull_request || !Number.isSafeInteger(issue.number) || issue.number <= 0) return undefined;
  if (!issue.title.startsWith('[VAGA] ') || typeof issue.body !== 'string') return undefined;
  if (!issue.body.trimStart().startsWith(CAREER_ISSUE_MARKER)) return undefined;
  const url = field(issue.body, 'URL');
  const decision = field(issue.body, 'Decisao').toLowerCase();
  if (!['review', 'approved', 'discarded'].includes(decision)) return undefined;
  if (url.length > 2048 || !url) return undefined;
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname) return undefined;
    if (/^(localhost|127\.|0\.|\[::1\])/.test(parsed.hostname)) return undefined;
  } catch { return undefined; }
  const company = field(issue.body, 'Empresa').slice(0, 160) || 'Company to identify';
  const role = field(issue.body, 'Cargo').slice(0, 160) || 'Opportunity under review';
  const analysis = field(issue.body, 'Analise').slice(0, 4000) || undefined;
  return { issueNumber: issue.number, issueUrl: issue.html_url,
    url, company, role, decision: decision as CareerReviewDecision, analysis };
}
