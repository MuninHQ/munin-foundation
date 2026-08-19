import { MemoryLedger } from './memory-ledger.js';
import { ProjectMemoryStore } from './project-memory.js';
import type { ControlPlaneDecision } from './control-plane-decisions.js';

export interface PersistControlPlaneDecisionResult {
  projectMemoryId: string;
  ledgerEntryId: string;
  created: boolean;
  superseded: number;
}

export class ControlPlaneDecisionStore {
  constructor(
    private readonly projectMemory: ProjectMemoryStore = new ProjectMemoryStore(),
    private readonly ledger: MemoryLedger = new MemoryLedger(),
  ) {}

  async persist(decision: ControlPlaneDecision): Promise<PersistControlPlaneDecisionResult> {
    const captured = await this.projectMemory.capture({
      id: decision.id,
      kind: 'decision',
      title: decision.decision,
      content: [
        `Context: ${decision.context}`,
        `Rationale: ${decision.rationale}`,
        decision.alternativesConsidered.length
          ? `Alternatives: ${decision.alternativesConsidered.join('; ')}`
          : 'Alternatives: none recorded',
      ].join('\n'),
      project: 'munin',
      source: decision.source,
      observedAt: decision.decidedAt,
      confidence: 'confirmed',
      tags: ['control-plane'],
      supersedes: decision.supersedes ? [decision.supersedes] : [],
      relatedIssues: decision.affectedRefs,
    });

    const appended = await this.ledger.append({
      kind: 'decision',
      scope: 'project',
      source: decision.source,
      summary: decision.decision,
      projectId: 'munin',
      entityId: decision.id,
      occurredAt: decision.decidedAt,
      payload: {
        context: decision.context,
        rationale: decision.rationale,
        alternativesConsidered: decision.alternativesConsidered,
        affectedRefs: decision.affectedRefs,
        supersedes: decision.supersedes,
        supersededBy: decision.supersededBy,
      },
    });

    return {
      projectMemoryId: captured.record.id,
      ledgerEntryId: appended.entry.id,
      created: captured.created || appended.added,
      superseded: captured.superseded,
    };
  }
}
