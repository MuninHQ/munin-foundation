import { sensitiveTextClasses } from './secret-redaction.js';
import type { AdaptiveTask, OutcomeRecord } from './adaptive-execution.js';

export const OUTCOME_HALF_LIFE_DAYS = 30;
const DAY_MS = 86_400_000;
const MAX_RESULTS = 5;
const MAX_REASON_LENGTH = 500;

export type OutcomeFeedbackRating = 'helpful' | 'neutral' | 'harmful';
export interface OutcomeFeedback { rating: OutcomeFeedbackRating; reason?: string; createdAt: string; }
export interface OutcomeRelevance { lexicalScore: number; ageDays: number; timeWeight: number; feedbackMultiplier: number; weightedScore: number; }
export type RankedOutcome = OutcomeRecord & { relevance: OutcomeRelevance };

export class OutcomeFeedbackValidationError extends Error {
  constructor() { super('Invalid outcome feedback.'); this.name = 'OutcomeFeedbackValidationError'; }
}

function validRating(value: unknown): value is OutcomeFeedbackRating {
  return value === 'helpful' || value === 'neutral' || value === 'harmful';
}

function safeReason(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= MAX_REASON_LENGTH && sensitiveTextClasses(value).length === 0);
}

export function isOutcomeFeedback(value: unknown): value is OutcomeFeedback {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as { rating?: unknown; reason?: unknown; createdAt?: unknown };
  return validRating(candidate.rating)
    && safeReason(candidate.reason)
    && typeof candidate.createdAt === 'string'
    && Number.isFinite(Date.parse(candidate.createdAt));
}

function validDate(now: Date): number {
  const milliseconds = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(milliseconds)) throw new OutcomeFeedbackValidationError();
  return milliseconds;
}

function feedbackMultiplier(record: OutcomeRecord): number {
  const rating = (record as OutcomeRecord & { feedback?: OutcomeFeedback }).feedback?.rating;
  if (rating === 'helpful') return 1.25;
  if (rating === 'harmful') return 0.25;
  return 1;
}

function lexicalScore(record: OutcomeRecord, task: AdaptiveTask): number {
  const terms = `${task.capability} ${task.objective}`.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  const haystack = `${record.capability} ${record.objective} ${record.tags.join(' ')} ${record.lesson}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function validateOutcomeFeedback(input: unknown, now: Date): OutcomeFeedback {
  const createdAt = new Date(validDate(now)).toISOString();
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new OutcomeFeedbackValidationError();
  const candidate = input as { rating?: unknown; reason?: unknown };
  if (!validRating(candidate.rating) || (candidate.reason !== undefined && typeof candidate.reason !== 'string')) throw new OutcomeFeedbackValidationError();
  const reason = candidate.reason?.trim();
  if (!safeReason(reason)) throw new OutcomeFeedbackValidationError();
  return reason ? { rating: candidate.rating, reason, createdAt } : { rating: candidate.rating, createdAt };
}

export function rankRelevantOutcomes(records: OutcomeRecord[], task: AdaptiveTask, now: Date): RankedOutcome[] {
  const nowMs = validDate(now);
  const ranked: RankedOutcome[] = [];
  for (const record of records) {
    const createdAtMs = Date.parse(record.createdAt);
    if (!Number.isFinite(createdAtMs)) continue;
    const score = lexicalScore(record, task);
    if (score === 0) continue;
    const ageDays = Math.max(0, (nowMs - createdAtMs) / DAY_MS);
    const timeWeight = 0.5 ** (ageDays / OUTCOME_HALF_LIFE_DAYS);
    const multiplier = feedbackMultiplier(record);
    ranked.push({ ...record, relevance: { lexicalScore: score, ageDays, timeWeight, feedbackMultiplier: multiplier, weightedScore: score * timeWeight * multiplier } });
  }
  return ranked.sort((left, right) => right.relevance.weightedScore - left.relevance.weightedScore || Date.parse(right.createdAt) - Date.parse(left.createdAt) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)).slice(0, MAX_RESULTS);
}
