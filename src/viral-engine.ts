import { runtimePath } from './config.js';
import { readJsonFile, writeJsonAtomic } from './storage.js';
import type { AgentTelemetry } from './agent-telemetry.js';
import type { TrustedSignal } from './trusted-source-radar.js';

export type ViralAgentId = 'viral-raven' | 'viral-loki' | 'viral-skald' | 'viral-forge' | 'viral-odin';
export type ViralSource = 'trusted-radar' | 'youtube' | 'pexels' | 'manual';
export type ViralChannel = 'youtube-long' | 'youtube-short' | 'instagram-reel' | 'linkedin';
export type ViralStage = 'scored' | 'architected' | 'production_queued' | 'published' | 'measured' | 'blocked';
export type ViralDecision = 'PRODUCE' | 'REVIEW' | 'REJECT';
export type ExperimentDecision = 'CONTINUE' | 'ITERATE' | 'PIVOT' | 'PAUSE' | 'STOP' | 'INSUFFICIENT_DATA';

export interface ViralDimensions {
  evergreen: number;
  demand: number;
  seriesDepth: number;
  differentiation: number;
  evidence: number;
  advertiserValue: number;
  copyrightRisk: number;
  productionEffort: number;
  factualRisk: number;
}

export interface ViralSignal {
  id: string;
  title: string;
  summary?: string;
  cluster: string;
  audienceQuestion: string;
  source: ViralSource;
  sourceUrl?: string;
  observedAt: string;
  publishedAt?: string;
  freshnessDays?: number;
  dateVerified?: boolean;
  dimensions: ViralDimensions;
}

export interface ViralEvidencePack {
  sourceUrls: string[];
  verifiedClaims: string[];
  originalityAngle: string;
  visualSourceNotes: string[];
  prohibitedClaims: string[];
  factChecked: boolean;
  reviewedAt: string;
}

export interface ViralArchitecture {
  audiencePromise: string;
  hook: string;
  sections: Array<{ title: string; payoff: string }>;
  titleHypotheses: string[];
  thumbnailHypotheses: string[];
  format: ViralChannel;
  scriptBrief: string;
  createdAt: string;
}

export interface ViralMetrics {
  ageHours: number;
  impressions: number;
  views: number;
  clickThroughRate: number;
  first30sRetention: number;
  averagePercentageViewed: number;
  returningViewers: number;
  subscribers: number;
  productionMinutes: number;
  cashCostBrl: number;
  capturedAt: string;
}

export interface ViralTopic {
  id: string;
  signalId: string;
  title: string;
  cluster: string;
  audienceQuestion: string;
  sourceUrl?: string;
  dimensions: ViralDimensions;
  opportunityScore: number;
  decision: ViralDecision;
  stage: ViralStage;
  scoreReasons: string[];
  blockers: string[];
  evidencePack?: ViralEvidencePack;
  architecture?: ViralArchitecture;
  productionJobId?: string;
  publishedUrl?: string;
  publishedAt?: string;
  metrics?: ViralMetrics;
  learning?: { bottleneck: string; decision: ExperimentDecision; nextTest: string; summary: string };
  createdAt: string;
  updatedAt: string;
}

export interface ViralProductionJob {
  id: string;
  topicId: string;
  status: 'queued';
  createdAt: string;
  handoff: {
    capability: 'media.content-video';
    action: 'plan';
    topic: string;
    script: string;
    aspectRatio: '16:9' | '9:16';
    providerPolicy: 'zero-cost-first';
    modelRouting: 'munin-provider-policy';
    assetPolicy: { pexelsOptional: true; licenseLedgerRequired: true; youtubeReuseAllowed: false };
  };
}

export interface ViralEvent {
  id: string;
  agentId: ViralAgentId;
  action: string;
  topicId?: string;
  outcome: 'completed' | 'blocked';
  detail: string;
  at: string;
}

export interface ViralEngineState {
  version: 1;
  experiment: {
    name: string;
    status: 'pilot';
    budgetCapBrl: number;
    weeklyHoursCap: number;
    publicationBoundary: 'manual-only';
    providerPolicy: 'zero-cost-first';
  };
  signals: ViralSignal[];
  topics: ViralTopic[];
  productionJobs: ViralProductionJob[];
  events: ViralEvent[];
  updatedAt: string;
}

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

export const VIRAL_AGENTS: ReadonlyArray<{ id: ViralAgentId; name: string; responsibility: string }> = [
  { id: 'viral-raven', name: 'Raven', responsibility: 'Trend Discovery' },
  { id: 'viral-loki', name: 'Loki', responsibility: 'Opportunity Score' },
  { id: 'viral-skald', name: 'Skald', responsibility: 'Content Architecture' },
  { id: 'viral-forge', name: 'Forge', responsibility: 'Production Handoff' },
  { id: 'viral-odin', name: 'Odin', responsibility: 'Analytics & Learning' },
];

const emptyState = (): ViralEngineState => ({
  version: 1,
  experiment: { name: 'Munin Viral Engine', status: 'pilot', budgetCapBrl: 500, weeklyHoursCap: 5, publicationBoundary: 'manual-only', providerPolicy: 'zero-cost-first' },
  signals: [], topics: [], productionJobs: [], events: [], updatedAt: new Date(0).toISOString(),
});

const clamp5 = (value: unknown, fallback = 0) => Math.max(0, Math.min(5, Number.isFinite(Number(value)) ? Number(value) : fallback));
const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
const uniq = (values: string[]) => [...new Set(values.map(clean).filter(Boolean))];
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const stopwords = new Set(['a','an','and','as','at','da','de','do','e','for','how','in','is','o','of','on','or','the','to','what','why','with']);

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

export function normalizeViralDimensions(input: Partial<ViralDimensions>): ViralDimensions {
  return {
    evergreen: clamp5(input.evergreen), demand: clamp5(input.demand), seriesDepth: clamp5(input.seriesDepth),
    differentiation: clamp5(input.differentiation), evidence: clamp5(input.evidence), advertiserValue: clamp5(input.advertiserValue),
    copyrightRisk: clamp5(input.copyrightRisk), productionEffort: clamp5(input.productionEffort), factualRisk: clamp5(input.factualRisk),
  };
}

export function scoreViralOpportunity(dimensions: ViralDimensions): { score: number; decision: ViralDecision; reasons: string[] } {
  const d = normalizeViralDimensions(dimensions);
  const positive = (d.evergreen * 20 + d.demand * 20 + d.seriesDepth * 15 + d.differentiation * 15 + d.evidence * 10 + d.advertiserValue * 10) / 5;
  const penalty = (d.copyrightRisk * 15 + d.productionEffort * 10 + d.factualRisk * 5) / 5;
  const score = Math.max(0, Math.min(100, Math.round(((positive - penalty) / 90) * 100)));
  const hardRisk = d.copyrightRisk >= 4 || d.factualRisk >= 4;
  const decision: ViralDecision = hardRisk ? 'REJECT' : score >= 65 ? 'PRODUCE' : score >= 45 ? 'REVIEW' : 'REJECT';
  const reasons = [`demand ${d.demand.toFixed(1)}/5`, `evergreen ${d.evergreen.toFixed(1)}/5`, `differentiation ${d.differentiation.toFixed(1)}/5`, `evidence ${d.evidence.toFixed(1)}/5`, `copyright risk ${d.copyrightRisk.toFixed(1)}/5`, `production effort ${d.productionEffort.toFixed(1)}/5`];
  if (hardRisk) reasons.unshift('hard risk gate triggered');
  return { score, decision, reasons };
}

function dimensionsFromTrustedSignal(signal: TrustedSignal): ViralDimensions {
  const freshness = signal.dateVerified && typeof signal.freshnessDays === 'number' ? Math.max(1, 5 - Math.min(4, Math.floor(signal.freshnessDays / 7))) : 1;
  return normalizeViralDimensions({ evergreen: 3, demand: Math.max(1, signal.relevance / 20), seriesDepth: signal.themes.length > 1 ? 4 : 3, differentiation: 3, evidence: signal.url ? 4 : 1, advertiserValue: 3, copyrightRisk: 1, productionEffort: 2, factualRisk: freshness <= 1 ? 3 : 2 });
}

export function signalsFromTrustedRadar(signals: TrustedSignal[]): ViralSignal[] {
  return signals.slice(0, 30).map(signal => ({
    id: `radar_${Buffer.from(signal.id).toString('base64url').slice(0, 24)}`,
    title: clean(signal.title), summary: signal.summary ? clean(signal.summary) : undefined,
    cluster: signal.themes[0] ?? 'General', audienceQuestion: `Why does ${clean(signal.title)} matter now?`,
    source: 'trusted-radar', sourceUrl: signal.url, observedAt: signal.fetchedAt, publishedAt: signal.publishedAt,
    freshnessDays: signal.freshnessDays, dateVerified: signal.dateVerified, dimensions: dimensionsFromTrustedSignal(signal),
  }));
}

function blockersFor(topic: ViralTopic): string[] {
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
  const blockers = blockersFor(topic);
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

function architectureFor(topic: ViralTopic, channel: ViralChannel): ViralArchitecture {
  const claims = topic.evidencePack?.verifiedClaims ?? []; const title = topic.title.replace(/[.!?]+$/, '');
  return {
    audiencePromise: `Understand ${topic.audienceQuestion.replace(/[?]+$/, '').toLowerCase()} and what to watch next.`,
    hook: `The obvious story about ${title} misses the decision that matters most.`,
    sections: [
      { title: 'The signal', payoff: claims[0] ?? 'Establish the verified change.' },
      { title: 'What is really happening', payoff: claims[1] ?? topic.evidencePack?.originalityAngle ?? 'Explain the mechanism.' },
      { title: 'The consequence', payoff: claims[2] ?? 'Translate the evidence into a practical decision.' },
      { title: 'What comes next', payoff: 'Close with one falsifiable expectation and the next question.' },
    ],
    titleHypotheses: [title, `${title}: the part everyone misses`, `What ${title} changes next`],
    thumbnailHypotheses: ['Single consequence symbol; no text', 'Before/after mechanism; maximum three words'], format: channel,
    scriptBrief: [`Hook: The obvious story misses the decision that matters most.`, ...claims.map((claim, index) => `Verified claim ${index + 1}: ${claim}`), `Original angle: ${topic.evidencePack?.originalityAngle ?? ''}`, 'Close with the next measurable consequence.'].join('\n'),
    createdAt: new Date().toISOString(),
  };
}

function learningFrom(metrics: ViralMetrics): NonNullable<ViralTopic['learning']> {
  if (metrics.impressions < 500) return { bottleneck: 'insufficient data', decision: 'INSUFFICIENT_DATA', nextTest: 'Collect a comparable-age sample before changing the format.', summary: 'Reach is too small for a reliable diagnosis.' };
  if (metrics.clickThroughRate < 4) return { bottleneck: 'packaging', decision: 'ITERATE', nextTest: 'Change only the title/thumbnail promise on the next comparable video.', summary: `CTR ${metrics.clickThroughRate}% is the clearest constraint.` };
  if (metrics.first30sRetention < 55) return { bottleneck: 'opening/hook', decision: 'ITERATE', nextTest: 'Open with the verified consequence inside the first ten seconds.', summary: `First-30-second retention ${metrics.first30sRetention}% points to the hook.` };
  if (metrics.averagePercentageViewed < 35) return { bottleneck: 'narrative/retention', decision: 'ITERATE', nextTest: 'Shorten the middle and add one evidence-to-consequence turn.', summary: `Average percentage viewed ${metrics.averagePercentageViewed}% points to narrative drag.` };
  return { bottleneck: 'none confirmed', decision: 'CONTINUE', nextTest: 'Repeat the structure in the same cluster before scaling.', summary: 'Packaging and retention cleared the initial directional gates.' };
}

export class ViralEngineStore {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private readonly file = runtimePath('viral-engine', 'state.json'), private readonly telemetry?: AgentTelemetry) {}
  load(): Promise<ViralEngineState> { return readJsonFile(this.file, emptyState); }
  private mutate<T>(operation: (state: ViralEngineState) => T | Promise<T>): Promise<T> {
    const run = this.tail.then(async () => { const state = await this.load(); const result = await operation(state); state.updatedAt = new Date().toISOString(); await writeJsonAtomic(this.file, state); return result; });
    this.tail = run.catch(() => undefined); return run;
  }
  private record(state: ViralEngineState, agentId: ViralAgentId, action: string, outcome: ViralEvent['outcome'], detail: string, topicId?: string) {
    const event: ViralEvent = { id: id('ve'), agentId, action, topicId, outcome, detail, at: new Date().toISOString() };
    state.events.unshift(event); state.events = state.events.slice(0, 200); const runId = topicId ?? event.id;
    this.telemetry?.emit({ name: outcome === 'blocked' ? 'human.blocked' : 'agent.completed', runId, taskId: topicId, agentId, outcome: detail, evidence: [action], metadata: { phase: action, capability: `viral.${action}` }, cost: 0 });
  }

  async ingest(input: Omit<ViralSignal, 'id' | 'observedAt'> & { id?: string; observedAt?: string }): Promise<ViralTopic> {
    return this.mutate(state => {
      const signal: ViralSignal = { ...input, id: input.id ?? id('signal'), observedAt: input.observedAt ?? new Date().toISOString(), title: clean(input.title), cluster: clean(input.cluster), audienceQuestion: clean(input.audienceQuestion), dimensions: normalizeViralDimensions(input.dimensions) };
      const existing = state.signals.find(item => item.id === signal.id || (item.title.toLowerCase() === signal.title.toLowerCase() && item.sourceUrl === signal.sourceUrl));
      if (existing) { const topic = state.topics.find(item => item.signalId === existing.id); if (!topic) throw new Error('Signal exists without a scored topic.'); return topic; }
      state.signals.unshift(signal); const scored = scoreViralOpportunity(signal.dimensions); const now = new Date().toISOString();
      const topic: ViralTopic = { id: id('topic'), signalId: signal.id, title: signal.title, cluster: signal.cluster, audienceQuestion: signal.audienceQuestion, sourceUrl: signal.sourceUrl, dimensions: signal.dimensions, opportunityScore: scored.score, decision: scored.decision, stage: scored.decision === 'REJECT' ? 'blocked' : 'scored', scoreReasons: scored.reasons, blockers: [], createdAt: now, updatedAt: now };
      topic.blockers = blockersFor(topic); state.topics.unshift(topic);
      this.record(state, 'viral-raven', 'discovery', 'completed', `Discovered ${signal.title}`, topic.id);
      this.record(state, 'viral-loki', 'score', scored.decision === 'REJECT' ? 'blocked' : 'completed', `${scored.decision} at ${scored.score}/100`, topic.id); return topic;
    });
  }

  async ingestTrusted(signals: TrustedSignal[]): Promise<{ added: number; duplicates: number; topics: ViralTopic[] }> {
    const topics: ViralTopic[] = []; let duplicates = 0;
    for (const signal of signalsFromTrustedRadar(signals)) { const before = (await this.load()).signals.length; const topic = await this.ingest(signal); const after = (await this.load()).signals.length; if (after === before) duplicates++; else topics.push(topic); }
    return { added: topics.length, duplicates, topics };
  }

  async prepareEvidence(topicId: string, input: { sourceUrls: string[]; verifiedClaims: string[]; originalityAngle: string; visualSourceNotes?: string[]; prohibitedClaims?: string[]; factChecked: boolean; confirmation: string; channel?: ViralChannel }): Promise<ViralTopic> {
    return this.mutate(state => {
      const topic = state.topics.find(item => item.id === topicId); if (!topic) throw new Error('Viral topic not found.');
      if (input.confirmation !== 'EVIDENCE_REVIEWED') throw new Error('Evidence confirmation is required.');
      const sourceUrls = uniq(input.sourceUrls); const verifiedClaims = uniq(input.verifiedClaims); const angle = clean(input.originalityAngle);
      if (!sourceUrls.length || !verifiedClaims.length || !angle || !input.factChecked) throw new Error('Sources, verified claims, originality angle and fact review are required.');
      topic.evidencePack = { sourceUrls, verifiedClaims, originalityAngle: angle, visualSourceNotes: uniq(input.visualSourceNotes ?? []), prohibitedClaims: uniq(input.prohibitedClaims ?? []), factChecked: true, reviewedAt: new Date().toISOString() };
      topic.architecture = architectureFor(topic, input.channel ?? 'youtube-long'); topic.stage = 'architected'; topic.updatedAt = new Date().toISOString(); topic.blockers = blockersFor(topic);
      this.record(state, 'viral-skald', 'architecture', 'completed', 'Evidence-backed content architecture prepared.', topic.id); return topic;
    });
  }

  async queueProduction(topicId: string, confirmation: string): Promise<ViralProductionJob> {
    const result = await this.mutate(state => {
      const topic = state.topics.find(item => item.id === topicId); if (!topic) throw new Error('Viral topic not found.');
      if (confirmation !== 'TOPIC_APPROVED_FOR_PRODUCTION') throw new Error('Explicit production approval is required.');
      const signal = state.signals.find(item => item.id === topic.signalId); const readiness = assessViralProductionReadiness(topic, signal, state.topics); topic.blockers = readiness.blockers;
      if (readiness.blockers.length) { const error = readiness.blockers.join(' '); topic.stage = 'blocked'; topic.updatedAt = new Date().toISOString(); this.record(state, 'viral-forge', 'production', 'blocked', error, topic.id); return { error }; }
      const existing = state.productionJobs.find(item => item.topicId === topic.id); if (existing) return { job: existing };
      const job: ViralProductionJob = { id: id('production'), topicId: topic.id, status: 'queued', createdAt: new Date().toISOString(), handoff: { capability: 'media.content-video', action: 'plan', topic: topic.title, script: topic.architecture!.scriptBrief, aspectRatio: topic.architecture!.format === 'youtube-long' ? '16:9' : '9:16', providerPolicy: 'zero-cost-first', modelRouting: 'munin-provider-policy', assetPolicy: { pexelsOptional: true, licenseLedgerRequired: true, youtubeReuseAllowed: false } } };
      state.productionJobs.unshift(job); topic.productionJobId = job.id; topic.stage = 'production_queued'; topic.updatedAt = new Date().toISOString(); topic.blockers = [];
      this.record(state, 'viral-forge', 'production', 'completed', 'Governed production handoff queued for Content Studio.', topic.id); return { job };
    });
    if ('error' in result) throw new Error(result.error); return result.job;
  }

  async markPublished(topicId: string, input: { url: string; finalRenderReviewed: boolean; titleAndThumbnailApproved: boolean; descriptionReviewed: boolean; licenseNotes: string[]; confirmation: string }): Promise<ViralTopic> {
    return this.mutate(state => {
      const topic = state.topics.find(item => item.id === topicId); if (!topic) throw new Error('Viral topic not found.');
      if (!topic.productionJobId) throw new Error('Production must be queued first.');
      if (input.confirmation !== 'I_PUBLISHED_THIS_MANUALLY') throw new Error('Manual publication confirmation is required.');
      if (!input.finalRenderReviewed || !input.titleAndThumbnailApproved || !input.descriptionReviewed || !uniq(input.licenseNotes).length) throw new Error('Final render, packaging, description and asset-license reviews are required.');
      const url = new URL(input.url); if (url.protocol !== 'https:') throw new Error('Published URL must use HTTPS.');
      topic.publishedUrl = url.toString(); topic.publishedAt = new Date().toISOString(); topic.stage = 'published'; topic.updatedAt = topic.publishedAt; topic.blockers = [];
      this.record(state, 'viral-forge', 'publication-record', 'completed', 'Manual publication recorded; Munin performed no external write.', topic.id); return topic;
    });
  }

  async recordMetrics(topicId: string, input: Omit<ViralMetrics, 'capturedAt'>): Promise<ViralTopic> {
    return this.mutate(state => {
      const topic = state.topics.find(item => item.id === topicId); if (!topic) throw new Error('Viral topic not found.');
      if (!topic.publishedAt) throw new Error('Metrics require a manually recorded publication.');
      const percent = (value: number, name: string) => { if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${name} must be between 0 and 100.`); return value; };
      const count = (value: number, name: string) => { if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be non-negative.`); return value; };
      topic.metrics = { ageHours: count(input.ageHours, 'ageHours'), impressions: count(input.impressions, 'impressions'), views: count(input.views, 'views'), clickThroughRate: percent(input.clickThroughRate, 'clickThroughRate'), first30sRetention: percent(input.first30sRetention, 'first30sRetention'), averagePercentageViewed: percent(input.averagePercentageViewed, 'averagePercentageViewed'), returningViewers: count(input.returningViewers, 'returningViewers'), subscribers: count(input.subscribers, 'subscribers'), productionMinutes: count(input.productionMinutes, 'productionMinutes'), cashCostBrl: count(input.cashCostBrl, 'cashCostBrl'), capturedAt: new Date().toISOString() };
      const learning = learningFrom(topic.metrics); topic.learning = learning; topic.stage = 'measured'; topic.updatedAt = topic.metrics.capturedAt;
      this.record(state, 'viral-odin', 'learning', 'completed', `${learning.decision}: ${learning.summary}`, topic.id); return topic;
    });
  }

  async snapshot() {
    const state = await this.load(); const ranked = [...state.topics].sort((a, b) => b.opportunityScore - a.opportunityScore || b.updatedAt.localeCompare(a.updatedAt));
    const usedBudget = ranked.reduce((sum, topic) => sum + (topic.metrics?.cashCostBrl ?? 0), 0); const usedMinutes = ranked.reduce((sum, topic) => sum + (topic.metrics?.productionMinutes ?? 0), 0);
    const pipeline = ['scored', 'architected', 'production_queued', 'published', 'measured', 'blocked'].map(stage => ({ stage, count: ranked.filter(topic => topic.stage === stage).length }));
    const agents = VIRAL_AGENTS.map(agent => ({ ...agent, lastEvent: state.events.find(event => event.agentId === agent.id) }));
    const executiveQueue = ranked.filter(topic => !['published','measured'].includes(topic.stage)).slice(0, 20).map(topic => ({ topicId: topic.id, title: topic.title, score: topic.opportunityScore, stage: topic.stage, ...assessViralProductionReadiness(topic, state.signals.find(signal => signal.id === topic.signalId), ranked) })).sort((a, b) => Number(b.state === 'ready') - Number(a.state === 'ready') || b.score - a.score);
    return { ...state, topics: ranked, agents, pipeline, executiveQueue, resources: { budgetUsedBrl: usedBudget, budgetRemainingBrl: Math.max(0, state.experiment.budgetCapBrl - usedBudget), humanMinutesRecorded: usedMinutes, weeklyMinutesCap: state.experiment.weeklyHoursCap * 60 }, policy: { automaticPublishing: false, paidProviderRequired: false, productionRequiresExplicitApproval: true, staleTrustedSignalProductionDays: 21, repetitionGate: 0.62 } };
  }
}
