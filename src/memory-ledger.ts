import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './config.js';

export type MemoryLedgerKind = 'conversation' | 'decision' | 'action' | 'observation' | 'career_intake' | 'system';
export type MemoryLedgerScope = 'local' | 'project' | 'global';

export interface MemoryLedgerEntry {
  id: string;
  kind: MemoryLedgerKind;
  scope: MemoryLedgerScope;
  source: string;
  summary: string;
  projectId?: string;
  entityId?: string;
  occurredAt: string;
  fingerprint: string;
  payload: Record<string, unknown>;
}

export interface AppendMemoryLedgerInput {
  kind: MemoryLedgerKind;
  scope?: MemoryLedgerScope;
  source: string;
  summary: string;
  projectId?: string;
  entityId?: string;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}

export interface MemoryLedgerQuery {
  kind?: MemoryLedgerKind;
  scope?: MemoryLedgerScope;
  source?: string;
  projectId?: string;
  entityId?: string;
  text?: string;
  limit?: number;
}

function stableFingerprint(input: AppendMemoryLedgerInput): string {
  const material = JSON.stringify({
    kind: input.kind,
    scope: input.scope ?? 'project',
    source: input.source,
    summary: input.summary.trim(),
    projectId: input.projectId,
    entityId: input.entityId,
    occurredAt: input.occurredAt,
    payload: input.payload ?? {},
  });
  return createHash('sha256').update(material).digest('hex');
}

export class MemoryLedger {
  constructor(private readonly root = dataDir()) {}
  private ledgerPath(): string { return path.join(this.root, 'memory-ledger.jsonl'); }

  async append(input: AppendMemoryLedgerInput): Promise<{ entry: MemoryLedgerEntry; added: boolean }> {
    await mkdir(this.root, { recursive: true });
    const fingerprint = stableFingerprint(input);
    const existing = (await this.list({ limit: 1000 })).find(entry => entry.fingerprint === fingerprint);
    if (existing) return { entry: existing, added: false };

    const entry: MemoryLedgerEntry = {
      id: randomUUID(),
      kind: input.kind,
      scope: input.scope ?? 'project',
      source: input.source,
      summary: input.summary.trim(),
      projectId: input.projectId,
      entityId: input.entityId,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      fingerprint,
      payload: input.payload ?? {},
    };
    await appendFile(this.ledgerPath(), `${JSON.stringify(entry)}\n`, 'utf8');
    return { entry, added: true };
  }

  async list(query: MemoryLedgerQuery = {}): Promise<MemoryLedgerEntry[]> {
    let entries: MemoryLedgerEntry[] = [];
    try {
      const raw = await readFile(this.ledgerPath(), 'utf8');
      entries = raw.split('\n').filter(Boolean).map(line => JSON.parse(line) as MemoryLedgerEntry);
    } catch { return []; }

    if (query.kind) entries = entries.filter(entry => entry.kind === query.kind);
    if (query.scope) entries = entries.filter(entry => entry.scope === query.scope);
    if (query.source) entries = entries.filter(entry => entry.source === query.source);
    if (query.projectId) entries = entries.filter(entry => entry.projectId === query.projectId);
    if (query.entityId) entries = entries.filter(entry => entry.entityId === query.entityId);
    if (query.text) { const needle=query.text.toLowerCase(); entries=entries.filter(entry=>`${entry.summary}\n${JSON.stringify(entry.payload)}`.toLowerCase().includes(needle)); }
    entries.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
    return entries.slice(0, Math.max(1, Math.min(query.limit ?? 100, 1000)));
  }
}
