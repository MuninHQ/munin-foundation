export interface ParallelAgentTask {
  id: string;
  objective: string;
  files: string[];
  dependsOn?: string[];
}

export interface ParallelAgentWave {
  index: number;
  taskIds: string[];
}

export interface ParallelAgentWavePlan {
  tasks: ParallelAgentTask[];
  waves: ParallelAgentWave[];
  serialFallbackTaskIds: string[];
}

export interface ParallelAgentTaskResult {
  taskId: string;
  status: 'completed' | 'failed' | 'blocked';
  summary: string;
  touchedFiles?: string[];
  evidence?: string[];
}

export interface ParallelAgentExecutionResult {
  status: 'completed' | 'failed' | 'blocked';
  completedWaves: number;
  results: ParallelAgentTaskResult[];
  blocker?: string;
}

export type ParallelAgentTaskRunner = (task: ParallelAgentTask) => Promise<ParallelAgentTaskResult>;

function normalizePath(path: string): string {
  return path.trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeTask(task: ParallelAgentTask): ParallelAgentTask {
  return {
    ...task,
    id: task.id.trim(),
    objective: task.objective.trim(),
    files: unique(task.files.map(normalizePath).filter(Boolean)),
    dependsOn: unique((task.dependsOn ?? []).map(value => value.trim()).filter(Boolean)),
  };
}

function filesOverlap(left: ParallelAgentTask, right: ParallelAgentTask): boolean {
  if (left.files.length === 0 || right.files.length === 0) return true;
  const rightFiles = new Set(right.files);
  return left.files.some(file => rightFiles.has(file));
}

function validateTasks(tasks: ParallelAgentTask[]): void {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (!task.id) throw new Error('Parallel task id is required.');
    if (!task.objective) throw new Error(`Parallel task ${task.id} requires an objective.`);
    if (ids.has(task.id)) throw new Error(`Duplicate parallel task id: ${task.id}.`);
    ids.add(task.id);
  }

  for (const task of tasks) {
    for (const dependency of task.dependsOn ?? []) {
      if (dependency === task.id) throw new Error(`Parallel task ${task.id} cannot depend on itself.`);
      if (!ids.has(dependency)) throw new Error(`Parallel task ${task.id} depends on unknown task ${dependency}.`);
    }
  }
}

function dependencyClosure(taskId: string, byId: Map<string, ParallelAgentTask>, visiting = new Set<string>()): Set<string> {
  if (visiting.has(taskId)) throw new Error(`Dependency cycle detected at task ${taskId}.`);
  const nextVisiting = new Set(visiting).add(taskId);
  const closure = new Set<string>();
  const task = byId.get(taskId)!;

  for (const dependency of task.dependsOn ?? []) {
    closure.add(dependency);
    for (const transitive of dependencyClosure(dependency, byId, nextVisiting)) closure.add(transitive);
  }
  return closure;
}

export function planParallelAgentWaves(input: ParallelAgentTask[]): ParallelAgentWavePlan {
  const tasks = input.map(normalizeTask);
  validateTasks(tasks);
  const byId = new Map(tasks.map(task => [task.id, task]));
  const closures = new Map(tasks.map(task => [task.id, dependencyClosure(task.id, byId)]));
  const serialFallbackTaskIds = tasks.filter(task => task.files.length === 0).map(task => task.id);
  const remaining = new Set(tasks.map(task => task.id));
  const completed = new Set<string>();
  const waves: ParallelAgentWave[] = [];

  while (remaining.size > 0) {
    const ready = tasks.filter(task => remaining.has(task.id) && (task.dependsOn ?? []).every(id => completed.has(id)));
    if (ready.length === 0) throw new Error('Dependency cycle prevents parallel wave planning.');

    const waveTasks: ParallelAgentTask[] = [];
    for (const task of ready) {
      const uncertainScope = task.files.length === 0;
      const dependencyConflict = waveTasks.some(other =>
        closures.get(task.id)!.has(other.id) || closures.get(other.id)!.has(task.id));
      const fileConflict = waveTasks.some(other => filesOverlap(task, other));

      if (waveTasks.length === 0 || (!uncertainScope && !dependencyConflict && !fileConflict)) waveTasks.push(task);
      if (uncertainScope) break;
    }

    const taskIds = waveTasks.map(task => task.id);
    waves.push({ index: waves.length + 1, taskIds });
    for (const taskId of taskIds) {
      remaining.delete(taskId);
      completed.add(taskId);
    }
  }

  return { tasks, waves, serialFallbackTaskIds };
}

function verifyTouchedFiles(task: ParallelAgentTask, result: ParallelAgentTaskResult): ParallelAgentTaskResult {
  const touched = unique((result.touchedFiles ?? []).map(normalizePath).filter(Boolean));
  if (task.files.length === 0 || touched.length === 0) return { ...result, touchedFiles: touched };
  const declared = new Set(task.files);
  const undeclared = touched.filter(file => !declared.has(file));
  if (undeclared.length === 0) return { ...result, touchedFiles: touched };

  return {
    taskId: task.id,
    status: 'failed',
    summary: `Worker touched undeclared files: ${undeclared.join(', ')}`,
    touchedFiles: touched,
    evidence: result.evidence,
  };
}

export async function executeParallelAgentWaves(
  plan: ParallelAgentWavePlan,
  runner: ParallelAgentTaskRunner,
): Promise<ParallelAgentExecutionResult> {
  const byId = new Map(plan.tasks.map(task => [task.id, task]));
  const results: ParallelAgentTaskResult[] = [];
  let completedWaves = 0;

  for (const wave of plan.waves) {
    const waveResults = await Promise.all(wave.taskIds.map(async taskId => {
      const task = byId.get(taskId);
      if (!task) throw new Error(`Wave references unknown task ${taskId}.`);
      try {
        return verifyTouchedFiles(task, await runner(task));
      } catch (error) {
        return {
          taskId,
          status: 'failed' as const,
          summary: error instanceof Error ? error.message : String(error),
        };
      }
    }));

    results.push(...waveResults);
    const blocker = waveResults.find(result => result.status === 'blocked');
    if (blocker) return { status: 'blocked', completedWaves, results, blocker: blocker.summary };
    const failure = waveResults.find(result => result.status === 'failed');
    if (failure) return { status: 'failed', completedWaves, results, blocker: failure.summary };
    completedWaves += 1;
  }

  return { status: 'completed', completedWaves, results };
}
