import crypto from 'node:crypto';

export type MemoryLifecycleState = 'active' | 'needs_review';

export interface MemoryObservationInput {
  project?: string;
  scope?: string;
  type?: string;
  title?: string;
  content?: string;
  topicKey?: string;
  updatedAt?: string | Date;
  reviewAfterDays?: number;
}

export interface MemoryObservationMetadata {
  fingerprint: string;
  normalizedTopicKey?: string;
  topicKeyValid: boolean;
  lifecycleState: MemoryLifecycleState;
  reviewAfter?: string;
}

const TOPIC_KEY_RE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeTopicKey(topicKey?: string): string | undefined {
  const normalized = normalizeText(topicKey).replace(/\s+/g, '-');
  return normalized || undefined;
}

export function isValidTopicKey(topicKey?: string): boolean {
  const normalized = normalizeTopicKey(topicKey);
  return Boolean(normalized && TOPIC_KEY_RE.test(normalized));
}

export function memoryFingerprint(input: MemoryObservationInput): string {
  const payload = [
    normalizeText(input.project),
    normalizeText(input.scope || 'project'),
    normalizeText(input.type),
    normalizeText(input.title),
    normalizeText(input.content),
  ].join('\u001f');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function deriveLifecycleState(
  updatedAt?: string | Date,
  reviewAfterDays = 90,
  now = new Date(),
): Pick<MemoryObservationMetadata, 'lifecycleState' | 'reviewAfter'> {
  if (!updatedAt || reviewAfterDays <= 0) {
    return { lifecycleState: 'active' };
  }

  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) {
    return { lifecycleState: 'active' };
  }

  const reviewAfter = new Date(updated.getTime() + reviewAfterDays * 86_400_000);
  return {
    lifecycleState: now >= reviewAfter ? 'needs_review' : 'active',
    reviewAfter: reviewAfter.toISOString(),
  };
}

export function observeMemory(input: MemoryObservationInput, now = new Date()): MemoryObservationMetadata {
  const normalizedTopicKey = normalizeTopicKey(input.topicKey);
  const lifecycle = deriveLifecycleState(input.updatedAt, input.reviewAfterDays ?? 90, now);
  return {
    fingerprint: memoryFingerprint(input),
    normalizedTopicKey,
    topicKeyValid: normalizedTopicKey ? isValidTopicKey(normalizedTopicKey) : true,
    ...lifecycle,
  };
}

export interface MemoryDoctorRecord extends MemoryObservationInput {
  id?: string | number;
}

export interface MemoryDoctorReport {
  total: number;
  duplicateGroups: Array<{ fingerprint: string; ids: Array<string | number>; count: number }>;
  topicRevisionGroups: Array<{ topicKey: string; ids: Array<string | number>; revisionCount: number }>;
  invalidTopicKeys: Array<{ id?: string | number; topicKey?: string }>;
  needsReview: Array<{ id?: string | number; reviewAfter?: string }>;
  oversized: Array<{ id?: string | number; size: number }>;
  missingScope: Array<{ id?: string | number }>;
  potentialConflicts: Array<{ topicKey: string; ids: Array<string | number>; fingerprints: string[] }>;
}

export function runMemoryDoctor(
  records: MemoryDoctorRecord[],
  options: { now?: Date; oversizedChars?: number } = {},
): MemoryDoctorReport {
  const now = options.now ?? new Date();
  const oversizedChars = options.oversizedChars ?? 12_000;
  const byFingerprint = new Map<string, Array<string | number>>();
  const byTopic = new Map<string, Array<string | number>>();
  const topicFingerprints = new Map<string, Map<string, Array<string | number>>>();
  const invalidTopicKeys: MemoryDoctorReport['invalidTopicKeys'] = [];
  const needsReview: MemoryDoctorReport['needsReview'] = [];
  const oversized: MemoryDoctorReport['oversized'] = [];
  const missingScope: MemoryDoctorReport['missingScope'] = [];

  records.forEach((record, index) => {
    const id = record.id ?? index;
    const observed = observeMemory(record, now);

    const dupes = byFingerprint.get(observed.fingerprint) ?? [];
    dupes.push(id);
    byFingerprint.set(observed.fingerprint, dupes);

    if (observed.normalizedTopicKey) {
      if (!observed.topicKeyValid) {
        invalidTopicKeys.push({ id, topicKey: record.topicKey });
      }
      const revisions = byTopic.get(observed.normalizedTopicKey) ?? [];
      revisions.push(id);
      byTopic.set(observed.normalizedTopicKey, revisions);
      const fingerprints = topicFingerprints.get(observed.normalizedTopicKey) ?? new Map<string, Array<string | number>>();
      const sameVersion = fingerprints.get(observed.fingerprint) ?? [];
      sameVersion.push(id);
      fingerprints.set(observed.fingerprint, sameVersion);
      topicFingerprints.set(observed.normalizedTopicKey, fingerprints);
    }

    if (!String(record.scope ?? '').trim()) missingScope.push({ id });

    if (observed.lifecycleState === 'needs_review') {
      needsReview.push({ id, reviewAfter: observed.reviewAfter });
    }

    const size = String(record.content ?? '').length;
    if (size > oversizedChars) oversized.push({ id, size });
  });

  return {
    total: records.length,
    duplicateGroups: [...byFingerprint.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([fingerprint, ids]) => ({ fingerprint, ids, count: ids.length })),
    topicRevisionGroups: [...byTopic.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([topicKey, ids]) => ({ topicKey, ids, revisionCount: ids.length })),
    invalidTopicKeys,
    needsReview,
    oversized,
    missingScope,
    potentialConflicts: [...topicFingerprints.entries()]
      .filter(([, fingerprints]) => fingerprints.size > 1)
      .map(([topicKey, fingerprints]) => ({
        topicKey,
        ids: [...fingerprints.values()].flat(),
        fingerprints: [...fingerprints.keys()],
      })),
  };
}
