import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { redactSecrets, redactSecretText } from './secret-redaction.js';

export type EvidenceKind = 'web' | 'file' | 'mail' | 'user' | 'system' | 'command' | 'artifact';

export interface EvidenceInput {
  kind: EvidenceKind;
  title: string;
  summary?: string;
  source?: string;
  url?: string;
  path?: string;
  content?: string;
  parentIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceRecord {
  schemaVersion: 1;
  id: string;
  kind: EvidenceKind;
  title: string;
  summary?: string;
  source?: string;
  url?: string;
  path?: string;
  contentHash?: string;
  parentIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  previousHash?: string;
  recordHash: string;
}

export interface EvidenceVerification {
  valid: boolean;
  records: number;
  brokenAt?: string;
  reason?: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return '{' + entries.map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}';
  }
  return JSON.stringify(value);
}

function hashable(record: Omit<EvidenceRecord, 'recordHash'>): string {
  return canonical(record);
}

export class EvidenceLedger {
  readonly path: string;

  constructor(path = resolve('data/runtime/evidence-ledger.jsonl')) {
    this.path = resolve(path);
  }

  private async rows(): Promise<EvidenceRecord[]> {
    try {
      const text = await readFile(this.path, 'utf8');
      return text.split(/\r?\n/).filter(Boolean).map(row => JSON.parse(row) as EvidenceRecord);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async append(input: EvidenceInput, createdAt = new Date().toISOString()): Promise<EvidenceRecord> {
    if (!input.title.trim()) throw new Error('Evidence title is required.');
    const existing = await this.rows();
    const previousHash = existing.at(-1)?.recordHash;
    const sanitized = redactSecrets({
      kind: input.kind,
      title: redactSecretText(input.title.trim()),
      summary: input.summary ? redactSecretText(input.summary) : undefined,
      source: input.source ? redactSecretText(input.source) : undefined,
      url: input.url,
      path: input.path,
      parentIds: [...new Set(input.parentIds ?? [])].sort(),
      metadata: input.metadata,
    });
    const base: Omit<EvidenceRecord, 'recordHash'> = {
      schemaVersion: 1,
      id: randomUUID(),
      kind: sanitized.kind,
      title: sanitized.title,
      summary: sanitized.summary,
      source: sanitized.source,
      url: sanitized.url,
      path: sanitized.path,
      contentHash: input.content === undefined ? undefined : sha256(redactSecretText(input.content)),
      parentIds: sanitized.parentIds,
      metadata: sanitized.metadata,
      createdAt,
      previousHash,
    };
    const record: EvidenceRecord = { ...base, recordHash: sha256(hashable(base)) };
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, JSON.stringify(record) + '\n', 'utf8');
    return record;
  }

  async list(limit = 100): Promise<EvidenceRecord[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('limit must be an integer between 1 and 1000');
    return (await this.rows()).slice(-limit).reverse();
  }

  async verify(): Promise<EvidenceVerification> {
    const records = await this.rows();
    let previousHash: string | undefined;
    for (const record of records) {
      if (record.previousHash !== previousHash) {
        return { valid: false, records: records.length, brokenAt: record.id, reason: 'previous hash mismatch' };
      }
      const { recordHash, ...base } = record;
      if (sha256(hashable(base)) !== recordHash) {
        return { valid: false, records: records.length, brokenAt: record.id, reason: 'record hash mismatch' };
      }
      previousHash = record.recordHash;
    }
    return { valid: true, records: records.length };
  }
}
