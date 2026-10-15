import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimePath } from './config.js';
import { redactSecretText } from './secret-redaction.js';
import type { EfficiencyObservation } from './efficiency-telemetry.js';

function valid(value: unknown): value is EfficiencyObservation { const item = value as Partial<EfficiencyObservation>; return Boolean(item && typeof item.runId === 'string' && item.creditSavingsProxy?.kind === 'estimated-avoidable-context-tokens' && typeof item.contextEfficiency?.avoidedContextChars === 'number'); }
export class EfficiencyTelemetryStore {
  constructor(private readonly file = runtimePath('efficiency-observations.jsonl')) {}
  async append(observation: EfficiencyObservation): Promise<void> { await mkdir(path.dirname(this.file), { recursive: true }); const safe = JSON.stringify(observation, (_key, value: unknown) => typeof value === 'string' ? redactSecretText(value) : value); await appendFile(this.file, safe + '\n', 'utf8'); }
  async list(limit = 100): Promise<EfficiencyObservation[]> { if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('limit must be an integer between 1 and 1000'); try { const rows: EfficiencyObservation[] = []; for (const line of (await readFile(this.file, 'utf8')).split(/\r?\n/).filter(Boolean)) { try { const item: unknown = JSON.parse(line); if (valid(item)) rows.push(item); } catch {} } return rows.slice(-limit).reverse(); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; } }
}
