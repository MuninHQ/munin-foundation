import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { dataDir } from './config.js';
import { writeJsonAtomic } from './storage.js';

export type InterviewSignal = 'context-reconstruction' | 'tool-fragmentation' | 'trust' | 'adoption' | 'workaround';

export interface ProblemInterviewRecord {
  id: string;
  participant: string;
  roleContext: string;
  conductedAt: string;
  observedBehaviors: string[];
  currentWorkarounds: string[];
  repeatedContextExamples: string[];
  trustConcerns: string[];
  adoptionConditions: string[];
  strongestPain?: string;
  wouldAdoptPersistentContext?: 'yes' | 'maybe' | 'no';
  notes?: string;
}

export interface ProblemInterviewSynthesis {
  count: number;
  completeForIssue3: boolean;
  adoption: { yes: number; maybe: number; no: number; unknown: number };
  recurringSignals: Array<{ signal: InterviewSignal; interviews: number }>;
  pains: string[];
  blockers: string[];
}

function clean(values: string[]): string[] {
  return values.map(value => value.trim()).filter(Boolean);
}

export function validateProblemInterview(input: ProblemInterviewRecord): ProblemInterviewRecord {
  if (!input.id.trim()) throw new Error('Interview id is required.');
  if (!input.participant.trim()) throw new Error('Participant label is required.');
  if (!input.roleContext.trim()) throw new Error('Role/context is required.');
  if (!Number.isFinite(Date.parse(input.conductedAt))) throw new Error('conductedAt must be an ISO-compatible timestamp.');
  const record = {
    ...input,
    observedBehaviors: clean(input.observedBehaviors),
    currentWorkarounds: clean(input.currentWorkarounds),
    repeatedContextExamples: clean(input.repeatedContextExamples),
    trustConcerns: clean(input.trustConcerns),
    adoptionConditions: clean(input.adoptionConditions),
    strongestPain: input.strongestPain?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  };
  if (record.observedBehaviors.length === 0) throw new Error('At least one observed behavior is required.');
  return record;
}

function signalCount(records: ProblemInterviewRecord[], signal: InterviewSignal): number {
  return records.filter(record => {
    switch (signal) {
      case 'context-reconstruction': return record.repeatedContextExamples.length > 0;
      case 'tool-fragmentation': return record.currentWorkarounds.length > 1;
      case 'trust': return record.trustConcerns.length > 0;
      case 'adoption': return record.adoptionConditions.length > 0 || Boolean(record.wouldAdoptPersistentContext);
      case 'workaround': return record.currentWorkarounds.length > 0;
    }
  }).length;
}

export function synthesizeProblemInterviews(records: ProblemInterviewRecord[]): ProblemInterviewSynthesis {
  const valid = records.map(validateProblemInterview);
  const adoption = { yes: 0, maybe: 0, no: 0, unknown: 0 };
  for (const record of valid) adoption[record.wouldAdoptPersistentContext ?? 'unknown'] += 1;
  const signals: InterviewSignal[] = ['context-reconstruction', 'tool-fragmentation', 'trust', 'adoption', 'workaround'];
  const recurringSignals = signals
    .map(signal => ({ signal, interviews: signalCount(valid, signal) }))
    .sort((a, b) => b.interviews - a.interviews || a.signal.localeCompare(b.signal));
  const pains = valid.map(record => record.strongestPain).filter((value): value is string => Boolean(value));
  const blockers: string[] = [];
  if (valid.length < 5) blockers.push(`Need ${5 - valid.length} more real interview(s) for issue #3.`);
  if (valid.length > 0 && recurringSignals[0]?.interviews < 2) blockers.push('No pain signal has repeated across at least two interviews yet.');
  return { count: valid.length, completeForIssue3: valid.length >= 5, adoption, recurringSignals, pains, blockers };
}

interface ProblemInterviewState { interviews: ProblemInterviewRecord[] }

export class ProblemInterviewStore {
  constructor(private readonly root = dataDir()) {}
  private file(): string { return path.join(this.root, 'research', 'problem-interviews.json'); }
  async load(): Promise<ProblemInterviewRecord[]> {
    try {
      const state = JSON.parse(await readFile(this.file(), 'utf8')) as Partial<ProblemInterviewState>;
      return (state.interviews ?? []).map(validateProblemInterview);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
  async add(record: ProblemInterviewRecord): Promise<{ added: boolean; interviews: ProblemInterviewRecord[]; synthesis: ProblemInterviewSynthesis }> {
    const validated = validateProblemInterview(record);
    const interviews = await this.load();
    if (interviews.some(existing => existing.id === validated.id)) return { added: false, interviews, synthesis: synthesizeProblemInterviews(interviews) };
    const next = [...interviews, validated].sort((a, b) => a.conductedAt.localeCompare(b.conductedAt));
    await mkdir(path.dirname(this.file()), { recursive: true });
    await writeJsonAtomic(this.file(), { interviews: next });
    return { added: true, interviews: next, synthesis: synthesizeProblemInterviews(next) };
  }
  async report(): Promise<ProblemInterviewSynthesis> { return synthesizeProblemInterviews(await this.load()); }
}
