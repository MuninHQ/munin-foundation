export type WorkLaneKind = 'repository' | 'cloud' | 'device';
export type WorkLaneStatus = 'queued' | 'running' | 'completed' | 'blocked' | 'failed';

export interface WorkLane {
  id: string;
  title: string;
  kind: WorkLaneKind;
  dependsOn?: string[];
  priority?: number;
}

export interface WorkLaneResult {
  laneId: string;
  status: Exclude<WorkLaneStatus, 'queued' | 'running'>;
  summary: string;
  blocker?: string;
  evidence?: string[];
}

export interface SchedulerOptions {
  maxParallel?: number;
}

export interface SchedulerResult {
  status: 'done' | 'partial' | 'failed';
  completed: WorkLaneResult[];
  deferred: WorkLaneResult[];
  failed: WorkLaneResult[];
}

export type WorkLaneExecutor = (lane: WorkLane) => Promise<WorkLaneResult>;

function validate(lanes: WorkLane[]): void {
  const ids = new Set<string>();
  for (const lane of lanes) {
    if (!lane.id.trim()) throw new Error('Lane id is required.');
    if (ids.has(lane.id)) throw new Error(`Duplicate lane id: ${lane.id}`);
    ids.add(lane.id);
  }
  for (const lane of lanes) for (const dep of lane.dependsOn ?? []) if (!ids.has(dep)) throw new Error(`Unknown dependency ${dep} for lane ${lane.id}.`);
}

export async function runWorkGraph(lanes: WorkLane[], executor: WorkLaneExecutor, options: SchedulerOptions = {}): Promise<SchedulerResult> {
  validate(lanes);
  const maxParallel = Math.max(1, Math.min(8, options.maxParallel ?? 3));
  const pending = new Map(lanes.map(l => [l.id, l]));
  const completedIds = new Set<string>();
  const completed: WorkLaneResult[] = [];
  const deferred: WorkLaneResult[] = [];
  const failed: WorkLaneResult[] = [];

  while (pending.size) {
    const ready = [...pending.values()]
      .filter(l => (l.dependsOn ?? []).every(dep => completedIds.has(dep)))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(0, maxParallel);

    if (!ready.length) {
      for (const lane of pending.values()) failed.push({ laneId: lane.id, status: 'failed', summary: 'Dependency graph cannot make further progress.' });
      break;
    }

    const results = await Promise.all(ready.map(async lane => {
      pending.delete(lane.id);
      try { return await executor(lane); }
      catch (error) { return { laneId: lane.id, status: 'failed' as const, summary: error instanceof Error ? error.message : String(error) }; }
    }));

    for (const result of results) {
      if (result.status === 'completed') { completed.push(result); completedIds.add(result.laneId); }
      else if (result.status === 'blocked') deferred.push(result);
      else failed.push(result);
    }
  }

  return { status: failed.length ? 'failed' : deferred.length ? 'partial' : 'done', completed, deferred, failed };
}
