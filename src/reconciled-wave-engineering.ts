import type { ParallelAgentTask, ParallelAgentWavePlan } from './parallel-agent-waves.js';
import { GitWaveReconciler, type GitWaveSession, type WaveCommitDelivery } from './git-wave-reconciler.js';

export interface BaseAwareEngineeringResult {
  status: 'completed' | 'blocked' | 'failed';
  summary: string;
  commit?: string;
  changedFiles?: string[];
  evidence?: string[];
  blocker?: string;
}

export interface BaseAwareEngineeringRuntime {
  execute(task: ParallelAgentTask, baseRef: string): Promise<BaseAwareEngineeringResult>;
}

export interface ReconciledWaveEngineeringResult {
  status: 'completed' | 'blocked' | 'failed';
  integrationBranch?: string;
  integrationHead?: string;
  completedWaves: number;
  taskResults: Array<BaseAwareEngineeringResult & { taskId: string; baseRef: string }>;
  evidence: string[];
  blocker?: string;
}

export interface WaveReconcilerPort {
  start(objective: string, baseRef?: string): Promise<GitWaveSession>;
  reconcile(session: GitWaveSession, deliveries: WaveCommitDelivery[]): Promise<{
    status: 'completed' | 'failed';
    head?: string;
    blocker?: string;
    evidence: string[];
  }>;
  dispose(session: GitWaveSession): Promise<void>;
}

function normalizePath(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function enforceDeclaredFiles(task: ParallelAgentTask, output: BaseAwareEngineeringResult): BaseAwareEngineeringResult {
  if (output.status !== 'completed') return output;
  const changedFiles = [...new Set((output.changedFiles ?? []).map(normalizePath).filter(Boolean))];
  if (task.files.length === 0 || changedFiles.length === 0) return { ...output, changedFiles };
  const declared = new Set(task.files.map(normalizePath));
  const undeclared = changedFiles.filter(file => !declared.has(file));
  if (undeclared.length === 0) return { ...output, changedFiles };
  return {
    status: 'failed',
    summary: `Engineering task ${task.id} touched undeclared files: ${undeclared.join(', ')}`,
    changedFiles,
    evidence: output.evidence,
  };
}

export class ReconciledWaveEngineeringRuntime {
  constructor(
    private readonly engineering: BaseAwareEngineeringRuntime,
    private readonly reconciler: WaveReconcilerPort = new GitWaveReconciler(),
  ) {}

  async run(objective: string, plan: ParallelAgentWavePlan, baseRef = 'main'): Promise<ReconciledWaveEngineeringResult> {
    const byId = new Map(plan.tasks.map(task => [task.id, task]));
    const taskResults: ReconciledWaveEngineeringResult['taskResults'] = [];
    const evidence: string[] = [];
    let completedWaves = 0;
    let session: GitWaveSession | undefined;
    let currentBase = baseRef;

    try {
      session = await this.reconciler.start(objective, baseRef);

      for (const wave of plan.waves) {
        const waveTasks = wave.taskIds.map(taskId => {
          const task = byId.get(taskId);
          if (!task) throw new Error(`Wave ${wave.index} references unknown task ${taskId}.`);
          return task;
        });

        const outputs = await Promise.all(waveTasks.map(async task => {
          try {
            const output = enforceDeclaredFiles(task, await this.engineering.execute(task, currentBase));
            return { task, output };
          } catch (error) {
            return {
              task,
              output: {
                status: 'failed' as const,
                summary: error instanceof Error ? error.message : String(error),
              },
            };
          }
        }));

        for (const { task, output } of outputs) {
          taskResults.push({ ...output, taskId: task.id, baseRef: currentBase });
          evidence.push(...(output.evidence ?? []));
        }

        const blocked = outputs.find(item => item.output.status === 'blocked');
        if (blocked) {
          return {
            status: 'blocked',
            integrationBranch: session.branch,
            integrationHead: currentBase,
            completedWaves,
            taskResults,
            evidence,
            blocker: blocked.output.blocker ?? blocked.output.summary,
          };
        }

        const failed = outputs.find(item => item.output.status === 'failed');
        if (failed) {
          return {
            status: 'failed',
            integrationBranch: session.branch,
            integrationHead: currentBase,
            completedWaves,
            taskResults,
            evidence,
            blocker: failed.output.blocker ?? failed.output.summary,
          };
        }

        const reconciliation = await this.reconciler.reconcile(session, outputs.map(({ task, output }) => ({
          taskId: task.id,
          commit: output.commit,
          summary: output.summary,
        })));
        evidence.push(...reconciliation.evidence);
        if (reconciliation.status === 'failed' || !reconciliation.head) {
          return {
            status: 'failed',
            integrationBranch: session.branch,
            integrationHead: currentBase,
            completedWaves,
            taskResults,
            evidence,
            blocker: reconciliation.blocker ?? `Wave ${wave.index} reconciliation failed.`,
          };
        }

        currentBase = reconciliation.head;
        completedWaves += 1;
      }

      return {
        status: 'completed',
        integrationBranch: session.branch,
        integrationHead: currentBase,
        completedWaves,
        taskResults,
        evidence,
      };
    } catch (error) {
      return {
        status: 'failed',
        integrationBranch: session?.branch,
        integrationHead: currentBase,
        completedWaves,
        taskResults,
        evidence,
        blocker: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (session) await this.reconciler.dispose(session);
    }
  }
}
