import { ExecutiveCheckpointStore } from './executive-checkpoint.js';
import { premiumBudgetFromEnv } from './model-router.js';
import { secondBrainStatus } from './second-brain.js';

function markdownItems(markdown: string, limit: number): string[] {
  return markdown.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^[-*]\s+/.test(line))
    .map(line => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

export async function secondBrainDaily(root = process.cwd()) {
  const [brain, checkpoints] = await Promise.all([
    secondBrainStatus(root),
    new ExecutiveCheckpointStore(root).list(30),
  ]);
  const active = checkpoints.filter(item => item.status === 'running');
  const blocked = checkpoints.filter(item => item.status === 'blocked' || item.status === 'failed');
  const completed = checkpoints.filter(item => item.status === 'done');
  const priorities = markdownItems(brain.controlRoom.timeline.map(item => item.summary).join('\n'), 5);
  const budget = premiumBudgetFromEnv();
  const recommendedNextAction = blocked[0]?.blocker
    ? `Resolve blocker for: ${blocked[0].objective} — ${blocked[0].blocker}`
    : active[0]
      ? `Resume: ${active[0].objective} from ${active[0].phase}.`
      : priorities[0] ?? 'No urgent executive checkpoint. Use the current control-room priorities.';

  return {
    generatedAt: new Date().toISOString(),
    health: {
      secondBrainOnline: brain.online,
      missingControlRoomFiles: brain.controlRoom.missing,
      premiumBudget: budget,
    },
    executive: {
      active: active.slice(0, 5),
      blocked: blocked.slice(0, 5),
      recentlyCompleted: completed.slice(0, 5),
    },
    memory: {
      recentTimeline: brain.controlRoom.timeline.slice(0, 8),
      priorities,
    },
    recommendedNextAction,
  };
}
