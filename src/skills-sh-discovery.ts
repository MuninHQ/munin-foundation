import { assessCapability, type CapabilityAssessment, type CapabilityCandidate } from './capability-radar.js';
import { benchmarkCapabilityCandidate, type CapabilityBenchmarkResult } from './capability-promotion-benchmark.js';
import { assessCapabilitySecurity, type CapabilitySecurityAssessment } from './capability-security-gate.js';

export interface SkillsShSkill {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  description?: string;
  url?: string;
  installUrl?: string;
}

export interface SkillsShAudit {
  provider: string;
  status?: string;
  summary?: string;
  riskLevel?: string;
  auditedAt?: string;
  categories?: string[];
}

export interface SkillsShAuditResult {
  available: boolean;
  audits: SkillsShAudit[];
  error?: string;
}

export interface SkillsShDiscoveryOptions {
  query: string;
  limit?: number;
  fetcher?: typeof fetch;
  apiBase?: string;
}

export type SkillsShObservationStatus = 'candidate' | 'hold' | 'reject';

export interface SkillsShObservation {
  skill: SkillsShSkill;
  mode: 'observe';
  status: SkillsShObservationStatus;
  installAllowed: false;
  executeAllowed: false;
  autoPromotionAllowed: false;
  capability: CapabilityAssessment;
  security: CapabilitySecurityAssessment;
  benchmark: CapabilityBenchmarkResult;
  audit: SkillsShAuditResult;
  reasons: string[];
  replay: string[];
}

export interface SkillsShDiscoveryReport {
  query: string;
  discovered: number;
  candidates: number;
  held: number;
  rejected: number;
  observations: SkillsShObservation[];
}

type SkillsShSearchItem = {
  id?: string;
  slug?: string;
  name?: string;
  source?: string;
  installs?: number;
  description?: string;
  url?: string;
  installUrl?: string;
};

type SkillsShSearchPayload = { skills?: SkillsShSearchItem[]; data?: SkillsShSearchItem[] };
type SkillsShAuditPayload = { audits?: SkillsShAudit[] };

function normalizeBase(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function stableSkillId(item: SkillsShSearchItem): { id: string; slug: string; source: string } | undefined {
  const source = item.source?.trim();
  if (!source) return undefined;
  const rawId = item.id?.trim();
  const rawSlug = item.slug?.trim();
  const slug = rawSlug || (rawId ? rawId.split('/').filter(Boolean).at(-1) : undefined) || item.name?.trim();
  if (!slug) return undefined;
  const id = rawId && rawId.split('/').filter(Boolean).length >= 3 ? rawId : `${source}/${slug}`;
  return { id, slug, source };
}

export async function searchSkillsSh(options: SkillsShDiscoveryOptions): Promise<SkillsShSkill[]> {
  const query = options.query.trim();
  if (query.length < 2) throw new Error('skills.sh discovery query must contain at least two characters.');
  const limit = Math.max(1, Math.min(20, options.limit ?? 8));
  const fetcher = options.fetcher ?? fetch;
  const base = normalizeBase(options.apiBase ?? 'https://skills.sh');
  const url = new URL('api/search', base);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  const response = await fetcher(url, { headers: { Accept: 'application/json', 'User-Agent': 'munin-skills-sh-discovery/1.0' }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`skills.sh discovery failed with HTTP ${response.status}.`);
  const payload = await response.json() as SkillsShSearchPayload;
  const items = Array.isArray(payload.skills) ? payload.skills : Array.isArray(payload.data) ? payload.data : [];
  return items.slice(0, limit).flatMap(item => {
    const stable = stableSkillId(item);
    if (!stable) return [];
    return [{
      id: stable.id,
      slug: stable.slug,
      source: stable.source,
      name: item.name?.trim() || stable.slug,
      installs: Math.max(0, Number(item.installs ?? 0) || 0),
      description: item.description?.trim() || undefined,
      url: item.url?.trim() || `https://skills.sh/${stable.id}`,
      installUrl: item.installUrl?.trim() || undefined,
    }];
  });
}

function encodeSkillId(id: string): string {
  return id.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

export async function fetchSkillsShAudit(skill: SkillsShSkill, options: Omit<SkillsShDiscoveryOptions, 'query' | 'limit'> = {}): Promise<SkillsShAuditResult> {
  const fetcher = options.fetcher ?? fetch;
  const base = normalizeBase(options.apiBase ?? 'https://skills.sh');
  const url = new URL(`api/v1/skills/audit/${encodeSkillId(skill.id)}`, base);
  try {
    const response = await fetcher(url, { headers: { Accept: 'application/json', 'User-Agent': 'munin-skills-sh-discovery/1.0' }, signal: AbortSignal.timeout(8_000) });
    if (response.status === 404) return { available: false, audits: [], error: 'No skills.sh security audit is available yet.' };
    if (!response.ok) return { available: false, audits: [], error: `skills.sh audit returned HTTP ${response.status}.` };
    const payload = await response.json() as SkillsShAuditPayload;
    const audits = Array.isArray(payload.audits) ? payload.audits : [];
    return { available: audits.length > 0, audits };
  } catch (error) {
    return { available: false, audits: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function auditSecurityScore(audit: SkillsShAuditResult): number {
  if (!audit.available || audit.audits.length === 0) return 0.45;
  let score = 0.9;
  for (const item of audit.audits) {
    const status = (item.status ?? '').toLowerCase();
    const risk = (item.riskLevel ?? '').toUpperCase();
    if (status === 'fail' || risk === 'CRITICAL') score = Math.min(score, 0.05);
    else if (risk === 'HIGH') score = Math.min(score, 0.2);
    else if (risk === 'MEDIUM') score = Math.min(score, 0.5);
    else if (status === 'warn') score = Math.min(score, 0.65);
  }
  return score;
}

function auditHasBlockingRisk(audit: SkillsShAuditResult): boolean {
  return audit.audits.some(item => {
    const status = (item.status ?? '').toLowerCase();
    const risk = (item.riskLevel ?? '').toUpperCase();
    return status === 'fail' || risk === 'HIGH' || risk === 'CRITICAL';
  });
}

function toCapabilityCandidate(skill: SkillsShSkill, audit: SkillsShAuditResult): CapabilityCandidate {
  const auditEvidence = audit.audits.map(item => `skills.sh audit: ${item.provider}=${item.status ?? 'unknown'}${item.riskLevel ? `/${item.riskLevel}` : ''}`);
  return {
    id: `skills-sh:${skill.id.toLowerCase()}`,
    name: skill.name,
    source: skill.url ?? `https://skills.sh/${skill.id}`,
    recurringCost: 0,
    metered: false,
    paidApiRequired: false,
    maintenanceScore: 0.5,
    securityScore: auditSecurityScore(audit),
    duplicationScore: 0,
    evidence: [
      `skills.sh source: ${skill.source}`,
      `skills.sh installs: ${skill.installs}`,
      'Discovery performed without installing or executing the skill.',
      ...(audit.available ? auditEvidence : [`skills.sh audit unavailable: ${audit.error ?? 'unknown'}`]),
    ],
  };
}

export function observeSkillsShCandidate(skill: SkillsShSkill, audit: SkillsShAuditResult): SkillsShObservation {
  const candidate = toCapabilityCandidate(skill, audit);
  const capability = assessCapability(candidate);
  const benchmark = benchmarkCapabilityCandidate(candidate);
  const security = assessCapabilitySecurity({
    id: candidate.id,
    source: candidate.source,
    manifest: [skill.name, skill.description ?? '', ...candidate.evidence ?? []].join('\n'),
    commands: [],
    networkDomains: ['skills.sh'],
    permissions: [],
  });
  const blockingAudit = auditHasBlockingRisk(audit);
  const status: SkillsShObservationStatus = blockingAudit ? 'reject' : capability.decision === 'reject' ? 'reject' : audit.available ? 'candidate' : 'hold';
  const reasons = [
    'Observation mode is enforced: automatic installation, execution and promotion are disabled.',
    ...(!audit.available ? [audit.error ?? 'Security audit unavailable.'] : []),
    ...(blockingAudit ? ['At least one skills.sh audit reports a failing, high or critical risk signal.'] : []),
    ...(!security.allowPromotion ? security.findings.map(finding => `${finding.code}: ${finding.detail}`) : []),
    ...(benchmark.status === 'hold' ? benchmark.reasons : []),
  ];
  const replay = [
    `discover ${skill.id}`,
    `collect audits (${audit.audits.length})`,
    `capability gate -> ${capability.decision}`,
    `security gate -> ${security.state}`,
    `promotion benchmark -> ${benchmark.status}`,
    'installation -> BLOCKED (observe mode)',
    'execution -> BLOCKED (observe mode)',
  ];
  return {
    skill,
    mode: 'observe',
    status,
    installAllowed: false,
    executeAllowed: false,
    autoPromotionAllowed: false,
    capability,
    security,
    benchmark,
    audit,
    reasons: [...new Set(reasons)],
    replay,
  };
}

export async function runSkillsShDiscovery(options: SkillsShDiscoveryOptions): Promise<SkillsShDiscoveryReport> {
  const skills = await searchSkillsSh(options);
  const observations = await Promise.all(skills.map(async skill => {
    const audit = await fetchSkillsShAudit(skill, { fetcher: options.fetcher, apiBase: options.apiBase });
    return observeSkillsShCandidate(skill, audit);
  }));
  return {
    query: options.query,
    discovered: observations.length,
    candidates: observations.filter(item => item.status === 'candidate').length,
    held: observations.filter(item => item.status === 'hold').length,
    rejected: observations.filter(item => item.status === 'reject').length,
    observations,
  };
}

export function formatSkillsShDiscoveryReport(report: SkillsShDiscoveryReport): string {
  const lines = [
    `skills.sh Discovery Adapter v1 · OBSERVE`,
    `Query: ${report.query}`,
    `Discovered: ${report.discovered} · Candidate: ${report.candidates} · Hold: ${report.held} · Reject: ${report.rejected}`,
    'Automatic install: BLOCKED · Automatic execution: BLOCKED · Automatic promotion: BLOCKED',
  ];
  for (const item of report.observations) {
    lines.push(`- ${item.skill.id}: ${item.status.toUpperCase()} · installs=${item.skill.installs} · security=${item.security.state} · benchmark=${item.benchmark.status}`);
  }
  return lines.join('\n');
}
