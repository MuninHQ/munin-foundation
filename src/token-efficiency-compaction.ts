import { redactSecrets } from './secret-redaction.js';
import { estimateTokens } from './token-efficiency-usage.js';

export interface CompactDecision { summary: string; evidence: string[] }
export interface CompactArtifact { id: string; path: string }
export interface WorkflowContextInput {
  objective: string;
  status: string;
  decisions: CompactDecision[];
  unresolved?: string[];
  errors: string[];
  artifacts: CompactArtifact[];
  blockers: string[];
  completed?: string[];
  nextSteps: string[];
  verification: string[];
  commentary: string[];
}
export interface CompactionLimits { maxTextChars: number; maxItemsPerSection: number }
export interface CompactWorkflowContext {
  objective: string;
  status: string;
  decisions: CompactDecision[];
  unresolved: string[];
  errors: string[];
  artifacts: CompactArtifact[];
  blockers: string[];
  completed: string[];
  nextSteps: string[];
  verification: string[];
  commentary: string[];
  coverage: { sourceItems: number; retainedItems: number; omissions: string[] };
  metrics: { originalBytes: number; compactedBytes: number; estimatedTokenReduction: number };
}

const DEFAULT_LIMITS: CompactionLimits = { maxTextChars: 2_000, maxItemsPerSection: 25 };

function boundedUnique(values: string[] | undefined, limits: CompactionLimits, omissions: string[], label: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values ?? []) {
    const normalized = raw.trim().replace(/\s+/g, ' ');
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    if (result.length >= limits.maxItemsPerSection) { omissions.push(`${label} items omitted`); break; }
    if (normalized.length > limits.maxTextChars) {
      result.push(`${normalized.slice(0, limits.maxTextChars)}… [TRUNCATED originalChars=${normalized.length}]`);
      omissions.push(`${label} truncated`);
    } else result.push(normalized);
  }
  return result;
}

export function compactWorkflowContext(input: WorkflowContextInput, overrides: Partial<CompactionLimits> = {}): CompactWorkflowContext {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  if (!Number.isInteger(limits.maxTextChars) || limits.maxTextChars < 50) throw new Error('maxTextChars must be an integer of at least 50.');
  if (!Number.isInteger(limits.maxItemsPerSection) || limits.maxItemsPerSection < 1) throw new Error('maxItemsPerSection must be a positive integer.');
  const originalBytes = Buffer.byteLength(JSON.stringify(input), 'utf8');
  const omissions: string[] = [];
  const decisions = input.decisions.slice(0, limits.maxItemsPerSection).map(item => ({
    summary: boundedUnique([item.summary], limits, omissions, 'decisions')[0] ?? '',
    evidence: boundedUnique(item.evidence, limits, omissions, 'decision evidence'),
  }));
  if (input.decisions.length > decisions.length) omissions.push('decision items omitted');
  const artifacts = input.artifacts.slice(0, limits.maxItemsPerSection).map(item => ({
    id: boundedUnique([item.id], limits, omissions, 'artifact id')[0] ?? '',
    path: boundedUnique([item.path], limits, omissions, 'artifact path')[0] ?? '',
  }));
  if (input.artifacts.length > artifacts.length) omissions.push('artifact items omitted');
  const base = redactSecrets({
    objective: boundedUnique([input.objective], limits, omissions, 'objective')[0] ?? '',
    status: boundedUnique([input.status], limits, omissions, 'status')[0] ?? '',
    decisions,
    unresolved: boundedUnique(input.unresolved, limits, omissions, 'unresolved'),
    errors: boundedUnique(input.errors, limits, omissions, 'errors'),
    artifacts,
    blockers: boundedUnique(input.blockers, limits, omissions, 'blockers'),
    completed: boundedUnique(input.completed, limits, omissions, 'completed'),
    nextSteps: boundedUnique(input.nextSteps, limits, omissions, 'next steps'),
    verification: boundedUnique(input.verification, limits, omissions, 'verification'),
    commentary: boundedUnique(input.commentary, limits, omissions, 'commentary'),
  });
  const sourceItems = input.decisions.length + input.errors.length + input.artifacts.length + input.blockers.length + input.nextSteps.length + input.verification.length + input.commentary.length + (input.unresolved?.length ?? 0) + (input.completed?.length ?? 0);
  const retainedItems = base.decisions.length + base.errors.length + base.artifacts.length + base.blockers.length + base.nextSteps.length + base.verification.length + base.commentary.length + base.unresolved.length + base.completed.length;
  const withoutMetrics = { ...base, coverage: { sourceItems, retainedItems, omissions: [...new Set(omissions)] } };
  const compactedBytes = Buffer.byteLength(JSON.stringify(withoutMetrics), 'utf8');
  return {
    ...withoutMetrics,
    metrics: {
      originalBytes,
      compactedBytes,
      estimatedTokenReduction: Math.max(0, estimateTokens(JSON.stringify(input)) - estimateTokens(JSON.stringify(withoutMetrics))),
    },
  };
}
