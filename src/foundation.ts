import type { EntityType, MuninState } from './types.js';

export interface IntegrityIssue {
  code: string;
  path: string;
  message: string;
}

export interface IntegrityReport {
  valid: boolean;
  checkedAt: string;
  counts: Record<string, number>;
  issues: IntegrityIssue[];
}

export interface ApiSnapshot {
  schemaVersion: '1.0';
  generatedAt: string;
  health: 'ok' | 'degraded';
  summary: {
    projects: number;
    openDecisions: number;
    pendingActions: number;
    activeJobs: number;
    openResearch: number;
    relations: number;
  };
  data: MuninState;
  integrity: IntegrityReport;
}

function duplicateIssues(ids: string[], path: string): IntegrityIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates].map(id => ({ code: 'duplicate_id', path, message: `Duplicate id: ${id}` }));
}

function entityIds(state: MuninState): Record<EntityType, Set<string>> {
  return {
    project: new Set(state.projects.map(item => item.id)),
    decision: new Set(state.decisions.map(item => item.id)),
    action: new Set(state.actions.map(item => item.id)),
    job: new Set(state.jobs.map(item => item.id)),
    research: new Set(state.research.map(item => item.id)),
  };
}

export function validateState(state: MuninState, now = new Date()): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  issues.push(...duplicateIssues(state.projects.map(item => item.id), 'projects'));
  issues.push(...duplicateIssues(state.decisions.map(item => item.id), 'decisions'));
  issues.push(...duplicateIssues(state.actions.map(item => item.id), 'actions'));
  issues.push(...duplicateIssues(state.jobs.map(item => item.id), 'jobs'));
  issues.push(...duplicateIssues(state.research.map(item => item.id), 'research'));
  issues.push(...duplicateIssues(state.relations.map(item => item.id), 'relations'));

  const ids = entityIds(state);
  for (const relation of state.relations) {
    if (!ids[relation.sourceType].has(relation.sourceId)) {
      issues.push({ code: 'orphan_relation_source', path: `relations/${relation.id}`, message: `Missing source ${relation.sourceType}/${relation.sourceId}` });
    }
    if (!ids[relation.targetType].has(relation.targetId)) {
      issues.push({ code: 'orphan_relation_target', path: `relations/${relation.id}`, message: `Missing target ${relation.targetType}/${relation.targetId}` });
    }
  }

  for (const research of state.research) {
    if (research.projectId && !ids.project.has(research.projectId)) {
      issues.push({ code: 'orphan_research_project', path: `research/${research.id}`, message: `Missing project ${research.projectId}` });
    }
    const evidenceIds = new Set(research.evidence.map(item => item.id));
    for (const synthesis of research.syntheses) {
      for (const evidenceId of synthesis.evidenceIds) {
        if (!evidenceIds.has(evidenceId)) {
          issues.push({ code: 'orphan_synthesis_evidence', path: `research/${research.id}/syntheses/${synthesis.version}`, message: `Missing evidence ${evidenceId}` });
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    checkedAt: now.toISOString(),
    counts: {
      projects: state.projects.length,
      decisions: state.decisions.length,
      actions: state.actions.length,
      jobs: state.jobs.length,
      research: state.research.length,
      relations: state.relations.length,
    },
    issues,
  };
}

export function buildApiSnapshot(state: MuninState, now = new Date()): ApiSnapshot {
  const integrity = validateState(state, now);
  return {
    schemaVersion: '1.0',
    generatedAt: now.toISOString(),
    health: integrity.valid ? 'ok' : 'degraded',
    summary: {
      projects: state.projects.length,
      openDecisions: state.decisions.filter(item => item.status === 'required').length,
      pendingActions: state.actions.filter(item => item.status === 'planned' || item.status === 'active' || item.status === 'blocked').length,
      activeJobs: state.jobs.filter(item => !['rejected', 'closed'].includes(item.status)).length,
      openResearch: state.research.filter(item => item.status === 'open').length,
      relations: state.relations.length,
    },
    data: state,
    integrity,
  };
}
