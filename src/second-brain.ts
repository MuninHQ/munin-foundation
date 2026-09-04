import { contextForConsumer, queryContextMemory, type ContextConsumer } from './context-memory.js';
import { captureKnowledge, exportContextToVault, knowledgeVaultStatus, searchKnowledgeVault } from './knowledge-vault.js';
import { appendSessionEvent, hydrateControlRoomState } from './control-room-state.js';

export type SecondBrainTaskInput = {
  task: string;
  project?: string;
  consumer?: ContextConsumer;
};

export type SecondBrainCommitInput = SecondBrainTaskInput & {
  summary: string;
  decisions?: string[];
  changed?: string[];
  nextSteps?: string[];
  failed?: string[];
  tags?: string[];
};

export type MemoryTimelineItem = {
  at: string;
  title: string;
  summary: string;
};

function compact(values: string[] | undefined): string[] {
  return (values ?? []).map(value => value.trim()).filter(Boolean);
}

function section(title: string, values: string[]): string {
  return values.length ? `\n## ${title}\n\n${values.map(value => `- ${value}`).join('\n')}\n` : '';
}

export function parseMemoryTimeline(markdown: string, limit = 30): MemoryTimelineItem[] {
  const pattern = /^##\s+([^\n]+?)\s+—\s+([^\n]+)\n\n([\s\S]*?)(?=\n##\s+|$)/gm;
  const items: MemoryTimelineItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const rawAt = match[1].trim();
    const parsed = new Date(rawAt);
    items.push({
      at: Number.isNaN(parsed.getTime()) ? rawAt : parsed.toISOString(),
      title: match[2].trim(),
      summary: match[3].trim(),
    });
  }
  return items.reverse().slice(0, Math.max(1, limit));
}

export async function recallBeforeTask(input: SecondBrainTaskInput, root = process.cwd()) {
  const task = input.task.trim();
  if (!task) throw new Error('Task is required.');
  const consumer = input.consumer ?? 'assistant';
  const [contextMatches, governedContext, vaultMatches, controlRoom, vault] = await Promise.all([
    queryContextMemory(`${input.project ?? ''} ${task}`.trim()),
    contextForConsumer(consumer),
    searchKnowledgeVault(`${input.project ?? ''} ${task}`.trim(), 8),
    hydrateControlRoomState(root),
    knowledgeVaultStatus(),
  ]);
  const project = input.project?.trim() || 'general';
  await appendSessionEvent({
    title: `MEMORY PRE-TASK · ${project}`,
    summary: `Task: ${task}\nConsumer: ${consumer}\nContext matches: ${contextMatches.length}\nVault matches: ${vaultMatches.length}`,
  }, root);
  return {
    protocol: 'pre-task' as const,
    task,
    project,
    consumer,
    context: {
      sections: governedContext.sections,
      stale: governedContext.stale,
      blockedSensitive: governedContext.blockedSensitive,
      matches: contextMatches,
    },
    vault: {
      status: vault,
      matches: vaultMatches,
    },
    controlRoom: {
      currentState: controlRoom.currentState,
      backlog: controlRoom.backlog,
      recentTimeline: parseMemoryTimeline(controlRoom.sessionLog, 12),
      missing: controlRoom.missing,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function commitAfterTask(input: SecondBrainCommitInput, root = process.cwd()) {
  const task = input.task.trim();
  const summary = input.summary.trim();
  if (!task) throw new Error('Task is required.');
  if (!summary) throw new Error('Summary is required.');
  const project = input.project?.trim() || 'general';
  const decisions = compact(input.decisions);
  const changed = compact(input.changed);
  const nextSteps = compact(input.nextSteps);
  const failed = compact(input.failed);
  const body = [
    `## Task\n\n${task}`,
    `\n## Summary\n\n${summary}`,
    section('Decisions', decisions),
    section('Changed', changed),
    section('Next steps', nextSteps),
    section('What did not work', failed),
  ].join('').trim();

  await appendSessionEvent({
    title: `MEMORY POST-TASK · ${project}`,
    summary: `${summary}${section('Decisions', decisions)}${section('Changed', changed)}${section('Next steps', nextSteps)}${section('What did not work', failed)}`,
  }, root);

  const note = await captureKnowledge({
    title: `${project} — ${task}`,
    body,
    kind: project === 'munin' ? 'munin' : 'project',
    scope: 'private-operational',
    source: 'munin-second-brain-post-task',
    tags: ['second-brain', 'task-memory', project, ...compact(input.tags)],
  });
  const mirror = await exportContextToVault();
  const controlRoom = await hydrateControlRoomState(root);
  return {
    protocol: 'post-task' as const,
    task,
    project,
    note: note.file,
    contextMirror: mirror,
    recentTimeline: parseMemoryTimeline(controlRoom.sessionLog, 12),
    committedAt: new Date().toISOString(),
  };
}

export async function secondBrainStatus(root = process.cwd()) {
  const [vault, controlRoom] = await Promise.all([
    knowledgeVaultStatus(),
    hydrateControlRoomState(root),
  ]);
  return {
    online: true,
    localFirst: true,
    mandatoryPaidDependencies: 0,
    vault,
    controlRoom: {
      missing: controlRoom.missing,
      timeline: parseMemoryTimeline(controlRoom.sessionLog, 30),
    },
    protocol: {
      preTask: 'recall-before-task',
      postTask: 'commit-after-task',
    },
  };
}
