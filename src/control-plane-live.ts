import path from 'node:path';

import { controlPlaneTasksFromControlRoom } from './control-plane-control-room-adapter.js';
import type { ControlPlaneDecision } from './control-plane-decisions.js';
import { projectControlPlaneSitrep, type ControlPlaneSitrepProjection } from './control-plane-sitrep.js';
import { hydrateControlRoomState } from './control-room-state.js';
import { ProjectMemoryStore } from './project-memory.js';

function decisionsFromProjectMemory(
  records: Awaited<ReturnType<ProjectMemoryStore['currentState']>>,
): ControlPlaneDecision[] {
  return records
    .filter((record) => record.kind === 'decision')
    .map((record) => ({
      id: record.id,
      decision: record.title,
      context: record.content,
      rationale: record.content,
      alternativesConsidered: [],
      affectedRefs: [...record.relatedIssues],
      source: record.source,
      decidedAt: record.observedAt,
      supersedes: record.supersedes[0],
    }));
}

export async function buildLiveControlPlaneProjection(
  root = process.cwd(),
): Promise<ControlPlaneSitrepProjection> {
  const controlRoom = await hydrateControlRoomState(root);
  const tasks = controlPlaneTasksFromControlRoom(controlRoom);
  const projectMemory = new ProjectMemoryStore(path.join(root, 'data/runtime/project-memory.json'));
  const decisions = decisionsFromProjectMemory(await projectMemory.currentState());
  return projectControlPlaneSitrep(tasks, decisions);
}
