import { assessCapability, type CapabilityAssessment, type CapabilityCandidate, type GithubMomentumEvidence } from './capability-radar.js';
import { assessCapabilitySecurity, type CapabilitySecurityAssessment } from './capability-security-gate.js';
import { benchmarkCapabilityCandidate, type CapabilityBenchmarkResult } from './capability-promotion-benchmark.js';

export type MuninGuardKind = 'skill' | 'mcp' | 'agent' | 'plugin' | 'automation' | 'repository';
export type MuninGuardDecision = 'PASS' | 'REVIEW' | 'BLOCK';
export type MuninGuardRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MuninGuardManifest {
  id: string;
  name: string;
  kind?: MuninGuardKind;
  source: string;
  manifest?: string;
  commands?: string[];
  networkDomains?: string[];
  permissions?: string[];
  pinnedRevision?: string;
  license?: string;
  recurringCost?: number;
  metered?: boolean;
  paidApiRequired?: boolean;
  maintenanceScore?: number;
  duplicationScore?: number;
  evidence?: string[];
  github?: GithubMomentumEvidence;
}

export interface MuninGuardResult {
  version: '0.1';
  id: string;
  name: string;
  kind: MuninGuardKind;
  decision: MuninGuardDecision;
  risk: MuninGuardRisk;
  capability: CapabilityAssessment;
  security: CapabilitySecurityAssessment;
  benchmark: CapabilityBenchmarkResult;
  reasons: string[];
  executionPolicy: {
    targetExecutionAllowed: false;
    automaticPromotionAllowed: false;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Munin Guard manifest requires a non-empty "${key}" string.`);
  return value.trim();
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`Munin Guard manifest field "${key}" must be a string.`);
  return value.trim() || undefined;
}

function optionalStringArray(record: Record<string, unknown>, key: string): string[] | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`Munin Guard manifest field "${key}" must be an array of strings.`);
  return value.map(item => item.trim()).filter(Boolean);
}

function optionalBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`Munin Guard manifest field "${key}" must be a boolean.`);
  return value;
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Munin Guard manifest field "${key}" must be a finite number.`);
  return value;
}

function clamp(value: number | undefined, fallback: number): number {
  return Math.max(0, Math.min(1, value ?? fallback));
}

function parseGithubEvidence(value: unknown): GithubMomentumEvidence | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error('Munin Guard manifest field "github" must be an object.');
  const stars = optionalNumber(value, 'stars');
  const forks = optionalNumber(value, 'forks');
  if (stars === undefined || forks === undefined) throw new Error('Munin Guard github evidence requires numeric "stars" and "forks".');
  const createdAt = requiredString(value, 'createdAt');
  const pushedAt = requiredString(value, 'pushedAt');
  return {
    stars,
    forks,
    createdAt,
    pushedAt,
    archived: optionalBoolean(value, 'archived'),
    observedAt: optionalString(value, 'observedAt'),
  };
}

export function parseMuninGuardManifest(value: unknown): MuninGuardManifest {
  if (!isRecord(value)) throw new Error('Munin Guard manifest must be a JSON object.');
  const allowedKinds: MuninGuardKind[] = ['skill', 'mcp', 'agent', 'plugin', 'automation', 'repository'];
  const rawKind = optionalString(value, 'kind');
  if (rawKind && !allowedKinds.includes(rawKind as MuninGuardKind)) throw new Error(`Unsupported Munin Guard kind "${rawKind}".`);
  return {
    id: requiredString(value, 'id'),
    name: requiredString(value, 'name'),
    kind: (rawKind as MuninGuardKind | undefined) ?? 'agent',
    source: requiredString(value, 'source'),
    manifest: optionalString(value, 'manifest'),
    commands: optionalStringArray(value, 'commands'),
    networkDomains: optionalStringArray(value, 'networkDomains'),
    permissions: optionalStringArray(value, 'permissions'),
    pinnedRevision: optionalString(value, 'pinnedRevision'),
    license: optionalString(value, 'license'),
    recurringCost: optionalNumber(value, 'recurringCost'),
    metered: optionalBoolean(value, 'metered'),
    paidApiRequired: optionalBoolean(value, 'paidApiRequired'),
    maintenanceScore: optionalNumber(value, 'maintenanceScore'),
    duplicationScore: optionalNumber(value, 'duplicationScore'),
    evidence: optionalStringArray(value, 'evidence'),
    github: parseGithubEvidence(value.github),
  };
}

function maxRisk(severities: Array<'low' | 'medium' | 'high' | 'critical'>): MuninGuardRisk {
  if (severities.includes('critical')) return 'CRITICAL';
  if (severities.includes('high')) return 'HIGH';
  if (severities.includes('medium')) return 'MEDIUM';
  return 'LOW';
}

export function assessMuninGuard(manifest: MuninGuardManifest): MuninGuardResult {
  const security = assessCapabilitySecurity({
    id: manifest.id,
    source: manifest.source,
    manifest: manifest.manifest,
    commands: manifest.commands,
    networkDomains: manifest.networkDomains,
    permissions: manifest.permissions,
    pinnedRevision: manifest.pinnedRevision,
    license: manifest.license,
  });

  const candidate: CapabilityCandidate = {
    id: manifest.id,
    name: manifest.name,
    source: manifest.source,
    license: manifest.license,
    recurringCost: manifest.recurringCost ?? 0,
    metered: manifest.metered ?? false,
    paidApiRequired: manifest.paidApiRequired ?? false,
    maintenanceScore: clamp(manifest.maintenanceScore, 0.5),
    securityScore: security.score,
    duplicationScore: clamp(manifest.duplicationScore, 0),
    evidence: manifest.evidence ?? [],
    github: manifest.github,
  };

  const capability = assessCapability(candidate);
  const benchmark = benchmarkCapabilityCandidate(candidate);
  const hasBlockingSecurity = security.findings.some(finding => finding.severity === 'high' || finding.severity === 'critical');

  const decision: MuninGuardDecision =
    hasBlockingSecurity || capability.decision === 'reject'
      ? 'BLOCK'
      : !security.allowPromotion || capability.decision !== 'adopt' || benchmark.status !== 'promote'
        ? 'REVIEW'
        : 'PASS';

  const risk = maxRisk(security.findings.map(finding => finding.severity));
  const reasons = [
    ...security.findings.map(finding => `${finding.code}: ${finding.detail}`),
    ...capability.reasons,
    ...benchmark.reasons,
  ];

  if (decision === 'PASS') reasons.unshift('All current Munin Guard v0.1 gates passed.');
  if (decision === 'REVIEW') reasons.unshift('Human review is required before promotion or execution.');
  if (decision === 'BLOCK') reasons.unshift('Promotion and execution are blocked by current policy evidence.');

  return {
    version: '0.1',
    id: manifest.id,
    name: manifest.name,
    kind: manifest.kind ?? 'agent',
    decision,
    risk,
    capability,
    security,
    benchmark,
    reasons: [...new Set(reasons)],
    executionPolicy: {
      targetExecutionAllowed: false,
      automaticPromotionAllowed: false,
    },
  };
}

export function formatMuninGuardReport(result: MuninGuardResult): string {
  const findings = result.security.findings.length
    ? result.security.findings.map(finding => `  - [${finding.severity.toUpperCase()}] ${finding.code}: ${finding.detail}`)
    : ['  - none'];
  return [
    'Munin Guard v0.1',
    `Target: ${result.name} (${result.kind})`,
    `Decision: ${result.decision}`,
    `Risk: ${result.risk}`,
    `Security: ${result.security.state} · score=${result.security.score}`,
    `Capability: ${result.capability.decision} · score=${result.capability.score}`,
    `Promotion benchmark: ${result.benchmark.status} · score=${result.benchmark.score}`,
    'Target execution: BLOCKED by Guard CLI',
    'Automatic promotion: BLOCKED by Guard CLI',
    'Findings:',
    ...findings,
    'Reasons:',
    ...result.reasons.map(reason => `  - ${reason}`),
  ].join('\n');
}
