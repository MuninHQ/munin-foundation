import { createHash, randomUUID } from 'node:crypto';
import { MemoryLedger } from './memory-ledger.js';
import { ContextStore } from './store.js';
import type { JobOpportunity } from './types.js';

export type CareerIntakeSource = 'share_sheet' | 'url' | 'screenshot' | 'image' | 'manual';

export interface CareerIntakeImage {
  mimeType: string;
  filename?: string;
  transientRef?: string;
  dataBase64?: string;
}

export interface CareerIntakeInput {
  source: CareerIntakeSource;
  url?: string;
  text?: string;
  extractedText?: string;
  title?: string;
  company?: string;
  role?: string;
  salaryRange?: string;
  currency?: string;
  image?: CareerIntakeImage;
  capturedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CareerMatchProfile {
  signals: string[];
  strongSignals?: string[];
}

export interface CareerIntakeExtractor {
  extract(input: CareerIntakeInput): Promise<string>;
}

export interface CareerIntakeDependencies {
  store?: ContextStore;
  ledger?: MemoryLedger;
  extractor?: CareerIntakeExtractor;
  profile?: CareerMatchProfile;
}

export interface CareerIntakeResult {
  job: JobOpportunity;
  added: boolean;
  duplicateOf?: string;
  intakeFingerprint: string;
}

const defaultProfile: CareerMatchProfile = {
  signals: ['product manager', 'product strategy', 'payments', 'fintech', 'banking', 'open finance', 'open banking', 'digital identity', 'digital assets', 'stablecoin', 'blockchain', 'artificial intelligence', ' ai ', 'innovation'],
  strongSignals: ['senior product manager', 'principal product manager', 'head of product', 'director of product', 'payments', 'open finance', 'digital assets'],
};

function normalizeSpace(value: string | undefined): string { return (value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value: string): string { return ` ${value.toLowerCase()} `; }

export function careerIntakeFingerprint(input: CareerIntakeInput): string {
  const material = JSON.stringify({
    source: input.source,
    url: normalizeSpace(input.url).toLowerCase(),
    text: normalizeSpace(input.extractedText ?? input.text).toLowerCase(),
    title: normalizeSpace(input.title).toLowerCase(),
    company: normalizeSpace(input.company).toLowerCase(),
    role: normalizeSpace(input.role).toLowerCase(),
    transientRef: normalizeSpace(input.image?.transientRef),
  });
  return createHash('sha256').update(material).digest('hex');
}

export function scoreCareerMatch(text: string, profile: CareerMatchProfile = defaultProfile): { score: number; matchedSignals: string[] } {
  const haystack = lower(text);
  const normal = [...new Set(profile.signals.map(signal => signal.trim().toLowerCase()).filter(Boolean))];
  const strong = new Set((profile.strongSignals ?? []).map(signal => signal.trim().toLowerCase()));
  const matchedSignals = normal.filter(signal => haystack.includes(` ${signal} `) || haystack.includes(signal));
  if (!matchedSignals.length) return { score: 0, matchedSignals: [] };
  const weighted = matchedSignals.reduce((total, signal) => total + (strong.has(signal) ? 2 : 1), 0);
  const max = Math.max(1, normal.reduce((total, signal) => total + (strong.has(signal) ? 2 : 1), 0));
  return { score: Math.min(100, Math.max(1, Math.round((weighted / max) * 100))), matchedSignals };
}

function inferRoleCompany(input: CareerIntakeInput, content: string): { role: string; company: string } {
  let role = normalizeSpace(input.role);
  let company = normalizeSpace(input.company);
  const title = normalizeSpace(input.title);
  const source = title || content.split(/[\n|]/).map(normalizeSpace).find(Boolean) || '';
  const atMatch = source.match(/^(.{2,100}?)\s+(?:at|@|na|no|em)\s+(.{2,100})$/i);
  if (!role && atMatch) role = normalizeSpace(atMatch[1]);
  if (!company && atMatch) company = normalizeSpace(atMatch[2]);
  if (!role) role = title || normalizeSpace(content.split('\n')[0]).slice(0, 120) || 'Opportunity under review';
  if (!company) company = 'Company to identify';
  return { role, company };
}

async function resolveContent(input: CareerIntakeInput, extractor?: CareerIntakeExtractor): Promise<string> {
  const supplied = normalizeSpace(input.extractedText ?? input.text);
  if (supplied) return supplied;
  if ((input.source === 'screenshot' || input.source === 'image') && extractor) return normalizeSpace(await extractor.extract(input));
  if (input.source === 'screenshot' || input.source === 'image') throw new Error('CAREER_INTAKE_EXTRACTOR_REQUIRED');
  if (input.url) return input.url;
  throw new Error('CAREER_INTAKE_CONTENT_REQUIRED');
}

export async function ingestCareerItem(input: CareerIntakeInput, dependencies: CareerIntakeDependencies = {}): Promise<CareerIntakeResult> {
  const store = dependencies.store ?? new ContextStore();
  const ledger = dependencies.ledger ?? new MemoryLedger();
  const content = await resolveContent(input, dependencies.extractor);
  const fingerprint = careerIntakeFingerprint({ ...input, extractedText: content, image: input.image ? { ...input.image, dataBase64: undefined } : undefined });
  const state = await store.load();
  const duplicate = state.jobs.find(job => job.notes?.includes(`intake:${fingerprint}`) || (input.url && job.link === input.url));
  if (duplicate) return { job: duplicate, added: false, duplicateOf: duplicate.id, intakeFingerprint: fingerprint };

  const { role, company } = inferRoleCompany(input, content);
  const match = scoreCareerMatch(`${role}\n${company}\n${content}`, dependencies.profile ?? defaultProfile);
  const now = input.capturedAt && !Number.isNaN(Date.parse(input.capturedAt)) ? new Date(input.capturedAt).toISOString() : new Date().toISOString();
  const job: JobOpportunity = {
    id: randomUUID(),
    company,
    role,
    description: content.slice(0, 30_000),
    source: `career-intake:${input.source}`,
    link: input.url,
    status: 'discovered',
    fitScore: match.score,
    matchedSignals: match.matchedSignals,
    salaryRange: input.salaryRange,
    currency: input.currency,
    nextAction: 'Qualificar oportunidade e decidir candidatura.',
    notes: `intake:${fingerprint}`,
    createdAt: now,
    updatedAt: now,
  };
  state.jobs.push(job);
  await store.save(state);
  await store.event('career.intake.created', 'job', job.id, { source: input.source, fingerprint, fitScore: job.fitScore });
  await ledger.append({
    kind: 'career_intake',
    scope: 'project',
    source: `career-intake:${input.source}`,
    summary: `${job.role} — ${job.company}`,
    projectId: 'career',
    entityId: job.id,
    occurredAt: now,
    payload: { fingerprint, url: input.url, fitScore: job.fitScore, matchedSignals: job.matchedSignals, metadata: input.metadata ?? {} },
  });
  return { job, added: true, intakeFingerprint: fingerprint };
}
