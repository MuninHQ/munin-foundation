export type BlockerCategory = 'repository' | 'cloud' | 'device' | 'credential' | '2fa' | 'financial' | 'irreversible' | 'permission' | 'strategic';
export type BlockerDisposition = 'retry' | 'reroute' | 'defer' | 'human';

export interface BlockerRecord {
  id: string;
  laneId: string;
  category: BlockerCategory;
  disposition: BlockerDisposition;
  reason: string;
  createdAt: string;
  resolvedAt?: string;
  evidence?: string[];
}

export class BlockerLedger {
  private readonly records = new Map<string, BlockerRecord>();

  add(record: Omit<BlockerRecord, 'createdAt'> & { createdAt?: string }): BlockerRecord {
    if (this.records.has(record.id)) return this.records.get(record.id)!;
    const stored: BlockerRecord = { ...record, createdAt: record.createdAt ?? new Date().toISOString() };
    this.records.set(stored.id, stored);
    return stored;
  }

  resolve(id: string, evidence: string[] = []): BlockerRecord {
    const current = this.records.get(id);
    if (!current) throw new Error(`Unknown blocker: ${id}`);
    const resolved = { ...current, resolvedAt: new Date().toISOString(), evidence: [...(current.evidence ?? []), ...evidence] };
    this.records.set(id, resolved);
    return resolved;
  }

  listOpen(): BlockerRecord[] { return [...this.records.values()].filter(r => !r.resolvedAt); }
  listAll(): BlockerRecord[] { return [...this.records.values()]; }
}
