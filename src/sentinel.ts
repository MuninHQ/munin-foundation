import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { evaluateAction, type ActionRequest, type PolicyResult } from './action-constitution.js';

export type RiskBand = 'GREEN' | 'AMBER' | 'RED';
export type SentinelDisposition = 'auto_execute' | 'guarded_execute' | 'needs_approval' | 'blocked';

export interface SentinelDecision {
  band: RiskBand;
  disposition: SentinelDisposition;
  rule: string;
  request: ActionRequest;
  policy: PolicyResult;
}

export interface ApprovalRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decision: SentinelDecision;
  note?: string;
  resolvedAt?: string;
  resolvedBy?: 'human';
}

export function evaluateSentinel(request: ActionRequest): SentinelDecision {
  const policy = evaluateAction(request);
  if (policy.decision === 'deny') return { band: 'RED', disposition: 'blocked', rule: policy.rule, request, policy };
  if (policy.decision === 'needs_user') return { band: 'RED', disposition: 'needs_approval', rule: policy.rule, request, policy };
  if (request.class === 'local-write' || request.class === 'git-write') {
    return { band: 'AMBER', disposition: 'guarded_execute', rule: `guarded-${request.class}`, request, policy };
  }
  return { band: 'GREEN', disposition: 'auto_execute', rule: policy.rule, request, policy };
}

export class ApprovalQueue {
  constructor(private readonly file = path.resolve('data/runtime/approval-queue.json')) {}

  private async readAll(): Promise<ApprovalRecord[]> {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as ApprovalRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async save(records: ApprovalRecord[]): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }

  async enqueue(decision: SentinelDecision, note?: string): Promise<ApprovalRecord> {
    if (decision.disposition !== 'needs_approval') throw new Error('Only approval-required decisions can be queued.');
    const records = await this.readAll();
    const now = new Date().toISOString();
    const record: ApprovalRecord = { id: randomUUID(), createdAt: now, updatedAt: now, status: 'pending', decision, note };
    records.push(record);
    await this.save(records);
    return record;
  }

  async list(status?: ApprovalRecord['status']): Promise<ApprovalRecord[]> {
    const records = await this.readAll();
    return status ? records.filter(record => record.status === status) : records;
  }

  async get(id: string): Promise<ApprovalRecord | undefined> {
    const record = (await this.readAll()).find(item => item.id === id);
    return record ? structuredClone(record) : undefined;
  }

  async resolve(id: string, status: 'approved' | 'rejected', note?: string): Promise<ApprovalRecord> {
    const records = await this.readAll();
    const record = records.find(item => item.id === id);
    if (!record) throw new Error(`Approval ${id} not found.`);
    if (record.status !== 'pending') throw new Error(`Approval ${id} is already ${record.status}.`);
    const resolvedAt = new Date().toISOString();
    record.status = status;
    record.updatedAt = resolvedAt;
    record.resolvedAt = resolvedAt;
    record.resolvedBy = 'human';
    if (note) record.note = note;
    await this.save(records);
    return record;
  }
}
