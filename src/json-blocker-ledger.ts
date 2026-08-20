import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BlockerRecord } from './blocker-ledger.js';

interface BlockerLedgerFile { version: 1; records: BlockerRecord[] }

export class JsonBlockerLedger {
  constructor(private readonly path: string) {}

  private async read(): Promise<BlockerLedgerFile> {
    try {
      const raw = await readFile(this.path, 'utf8');
      const parsed = JSON.parse(raw) as BlockerLedgerFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.records)) throw new Error('Unsupported blocker ledger format.');
      return parsed;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { version: 1, records: [] };
      throw error;
    }
  }

  private async write(file: BlockerLedgerFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, JSON.stringify(file, null, 2) + '\n', 'utf8');
    await rename(tmp, this.path);
  }

  async add(record: Omit<BlockerRecord, 'createdAt'> & { createdAt?: string }): Promise<BlockerRecord> {
    const file = await this.read();
    const existing = file.records.find(r => r.id === record.id);
    if (existing) return existing;
    const stored: BlockerRecord = { ...record, createdAt: record.createdAt ?? new Date().toISOString() };
    file.records.push(stored);
    await this.write(file);
    return stored;
  }

  async resolve(id: string, evidence: string[] = []): Promise<BlockerRecord> {
    const file = await this.read();
    const index = file.records.findIndex(r => r.id === id);
    if (index < 0) throw new Error(`Unknown blocker: ${id}`);
    const current = file.records[index];
    const resolved: BlockerRecord = { ...current, resolvedAt: current.resolvedAt ?? new Date().toISOString(), evidence: [...(current.evidence ?? []), ...evidence] };
    file.records[index] = resolved;
    await this.write(file);
    return resolved;
  }

  async listOpen(): Promise<BlockerRecord[]> { return (await this.read()).records.filter(r => !r.resolvedAt); }
  async listAll(): Promise<BlockerRecord[]> { return (await this.read()).records; }
}
