import type { ViralSignal, ViralTopic } from './viral-engine.js';

export interface ViralProductionReadiness {
  topicId: string;
  state: 'ready' | 'blocked';
  freshness: 'fresh' | 'stale' | 'unverified' | 'not-applicable';
  freshnessDays?: number;
  repetitionRisk: number;
  duplicateTopicId?: string;
  blockers: string[];
  nextAction: string;
}

const stopwords = new Set(['a','an','and','as','at','da','de','do','e','for','how','in','is','o','of','on','or','the','to','what','why','with']);
const uniq = (values: string[]) => [...new Set(values.map(value => value.trim().replace(/\s+/g, ' ')).filter(Boolean))];

function titleTokens(value: string) {
  return new Set(value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(token => token.length > 1 && !stopwords.has(token)));
}

function similarity(a: string, b: string) {
  const left = titleTokens(a); const right = titleTokens(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(token => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function baseBlockers(topic: ViralTopic) {
  const blockers: string[] = [];
  if (topic.decision === 'REJECT') blockers.push('Opportunity score or hard-risk gate rejected this topic.');
  if (!topic.evidencePack?.sourceUrls.length) blockers.push('Source-backed evidence is missing.');
  if (!topic.evidencePack?.verifiedClaims.length) blockers.push('Verified claims are missing.');
  if (!topic.evidencePack?.originalityAngle) blockers.push('Originality angle is missing.');
  if (!topic.evidencePack?.factChecked) blockers.push('Claim-level fact review is missing.');
  if (!topic.architecture) blockers.push('Content architecture is missing.');
  return blockers;
}

export function assessViralProductionReadiness(topic: ViralTopic, signal: ViralSignal | undefined, topics: ViralTopic[], staleAfterDays = 21): ViralProductionReadiness {
  const blockers = baseBlockers(topic);
  let freshness: ViralProductionReadiness['freshness'] = 'not-applicable';
  if (signal?.source === 'trusted-radar') {
    if (signal.dateVerified !== true || typeof signal.freshnessDays !== 'number') {
      freshness = 'unverified'; blockers.push('Trusted-radar freshness is not verified.');
    } else if (signal.freshnessDays > staleAfterDays) {
      freshness = 'stale'; blockers.push(`Trusted-radar signal is stale (${signal.freshnessDays} days; production gate is ${staleAfterDays}).`);
    } else freshness = 'fresh';
  }
  let repetitionRisk = 0; let duplicateTopicId: string | undefined;
  for (const other of topics) {
    if (other.id === topic.id || other.stage === 'blocked') continue;
    const risk = topic.sourceUrl && other.sourceUrl && topic.sourceUrl === other.sourceUrl ? 1 : similarity(topic.title, other.title);
    if (risk > repetitionRisk) { repetitionRisk = risk; duplicateTopicId = other.id; }
  }
  if (repetitionRisk >= 0.62) blockers.push(`Topic substantially overlaps existing pipeline item ${duplicateTopicId}.`);
  const state = blockers.length ? 'blocked' : 'ready';
  const nextAction = state === 'ready'
    ? 'Queue the governed production handoff after explicit TOPIC_APPROVED_FOR_PRODUCTION confirmation.'
    : freshness === 'stale' ? 'Refresh the source signal before production.'
      : repetitionRisk >= 0.62 ? 'Differentiate the thesis or retire the duplicate before production.'
        : blockers[0] ?? 'Resolve production blockers.';
  return { topicId: topic.id, state, freshness, freshnessDays: signal?.freshnessDays, repetitionRisk: Number(repetitionRisk.toFixed(3)), duplicateTopicId: repetitionRisk >= 0.62 ? duplicateTopicId : undefined, blockers: uniq(blockers), nextAction };
}
