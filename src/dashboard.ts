import type { MuninEvent, MuninState } from './types.js';

const terminalJobs = new Set(['offer', 'rejected', 'closed']);

function daysUntil(value: string, now: Date): number {
  return Math.ceil((new Date(value).getTime() - now.getTime()) / 86_400_000);
}

export function generateCommandCenter(state: MuninState, events: MuninEvent[], now = new Date()): string {
  const activeProjects = state.projects
    .filter(project => project.status === 'active' || project.status === 'blocked')
    .sort((a, b) => a.priority.localeCompare(b.priority));
  const pendingDecisions = state.decisions.filter(decision => decision.status === 'required');
  const openResearch = state.research.filter(record => record.status === 'open');
  const unsynthesized = state.research.filter(record => record.evidence.length > 0 && record.syntheses.length === 0);
  const followUps = state.jobs
    .filter(job => job.followUpAt && new Date(job.followUpAt).getTime() <= now.getTime() && !terminalJobs.has(job.status))
    .sort((a, b) => new Date(a.followUpAt!).getTime() - new Date(b.followUpAt!).getTime());
  const interviews = state.jobs.filter(job => job.status === 'interview');
  const offers = state.jobs.filter(job => job.status === 'offer');
  const blockedRelations = state.relations.filter(relation => relation.type === 'blocks');
  const dueActions = state.actions
    .filter(action => action.dueAt && action.status !== 'done' && daysUntil(action.dueAt, now) <= 7)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
  const recent = events.slice(-8).reverse();

  const health = blockedRelations.length || pendingDecisions.length > 3 || followUps.length > 3
    ? 'ATTENTION'
    : activeProjects.length || interviews.length || openResearch.length
      ? 'ACTIVE'
      : 'STABLE';

  const alerts = [
    ...blockedRelations.map(relation => `Blocked: ${relation.sourceType}/${relation.sourceId} -> ${relation.targetType}/${relation.targetId}`),
    ...followUps.map(job => `Career follow-up due: ${job.company} — ${job.role}`),
    ...unsynthesized.map(record => `Research awaiting synthesis: ${record.question}`),
    ...dueActions.filter(action => daysUntil(action.dueAt!, now) < 0).map(action => `Overdue action: ${action.title}`),
  ];

  const agenda = [
    ...dueActions.map(action => `${action.dueAt!.slice(0, 10)} — ${action.title}`),
    ...followUps.map(job => `${job.followUpAt!.slice(0, 10)} — Follow up ${job.company}`),
  ].sort();

  return [
    `MUNIN COMMAND CENTER — ${now.toISOString().slice(0, 10)}`,
    `Health: ${health}`,
    '',
    'Executive snapshot:',
    `- Projects active/blocked: ${activeProjects.length}`,
    `- Decisions required: ${pendingDecisions.length}`,
    `- Actions due in 7 days: ${dueActions.length}`,
    `- Career interviews/offers: ${interviews.length}/${offers.length}`,
    `- Career follow-ups due: ${followUps.length}`,
    `- Research open/awaiting synthesis: ${openResearch.length}/${unsynthesized.length}`,
    '',
    'Hotspots:',
    ...(alerts.length ? alerts.slice(0, 10).map(alert => `- ${alert}`) : ['- No critical alerts.']),
    '',
    'Operational agenda:',
    ...(agenda.length ? agenda.slice(0, 10).map(item => `- ${item}`) : ['- No dated commitments.']),
    '',
    'Active projects:',
    ...(activeProjects.length ? activeProjects.slice(0, 7).map(project => `- [${project.priority}] ${project.name} — ${project.status} — ${project.nextAction ?? project.currentOutcome}`) : ['- No active projects.']),
    '',
    'Career focus:',
    ...([...offers, ...interviews, ...followUps].length
      ? [...new Map([...offers, ...interviews, ...followUps].map(job => [job.id, job])).values()].slice(0, 7).map(job => `- ${job.company} — ${job.role} — ${job.status} — ${job.nextAction ?? 'Review next step'}`)
      : ['- No urgent career items.']),
    '',
    'Research focus:',
    ...(openResearch.length ? openResearch.slice(0, 7).map(record => `- ${record.question} — evidence ${record.evidence.length}, syntheses ${record.syntheses.length}`) : ['- No open research.']),
    '',
    'Recent activity:',
    ...(recent.length ? recent.map(event => `- ${event.timestamp}: ${event.type} (${event.entityType}/${event.entityId})`) : ['- No recorded activity.']),
  ].join('\n');
}
