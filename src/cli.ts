#!/usr/bin/env node
import { MuninService } from './service.js';
import type { EntityType, JobStatus, Priority, RelationType, Status } from './types.js';
const service = new MuninService();
const [command, subcommand, ...args] = process.argv.slice(2);
async function main(): Promise<void> {
  if (command === 'sitrep') { if (subcommand === '--since') { const value = args[0]; if (!value || Number.isNaN(new Date(value).getTime())) throw new Error('Usage: munin sitrep --since <ISO-date>'); return console.log(await service.sitrep(new Date(value))); } return console.log(await service.sitrep()); }
  if (command === 'career' && subcommand === 'sitrep') return console.log(await service.careerSitrep());
  if (command === 'career' && subcommand === 'queue') return console.log(JSON.stringify(await service.careerQueue(), null, 2));
  if (command === 'context' && subcommand === 'inspect') return console.log(await service.inspect());
  if (command === 'context' && subcommand === 'export') return console.log(await service.exportContext());
  if (command === 'context' && subcommand === 'related') { const [entityId] = args; if (!entityId) throw new Error('Usage: munin context related <entity-id>'); return console.log(JSON.stringify(await service.relatedContext(entityId), null, 2)); }
  if (command === 'relation' && subcommand === 'add') { const [sourceType, sourceId, relationType, targetType, targetId] = args; if (!sourceType || !sourceId || !relationType || !targetType || !targetId) throw new Error('Usage: munin relation add <source-type> <source-id> <relation-type> <target-type> <target-id>'); return console.log(await service.addRelation(sourceType as EntityType, sourceId, relationType as RelationType, targetType as EntityType, targetId)); }
  if (command === 'project' && subcommand === 'list') return console.log(JSON.stringify(await service.listProjects(), null, 2));
  if (command === 'project' && subcommand === 'add') { const priority = (args[0]?.match(/^P[0-2]$/) ? args.shift() : 'P1') as Priority; return console.log(await service.addProject(args.join(' '), priority)); }
  if (command === 'project' && subcommand === 'update') { const [projectId, status, ...nextAction] = args; if (!projectId || !status) throw new Error('Usage: munin project update <project-id> <status> [next-action]'); return console.log(await service.updateProject(projectId, status as Status, nextAction.join(' ') || undefined)); }
  if (command === 'decision' && subcommand === 'add') return console.log(await service.addDecision(args.join(' ')));
  if (command === 'decision' && subcommand === 'resolve') { const [decisionId, status, ...rationale] = args; if (!decisionId || !['accepted', 'rejected'].includes(status)) throw new Error('Usage: munin decision resolve <decision-id> <accepted|rejected> [rationale]'); return console.log(await service.resolveDecision(decisionId, status as 'accepted' | 'rejected', rationale.join(' ') || undefined)); }
  if (command === 'action' && subcommand === 'add') { const priority = (args[0]?.match(/^P[0-2]$/) ? args.shift() : 'P1') as Priority; return console.log(await service.addAction(args.join(' '), priority)); }
  if (command === 'execute') { const actionId = subcommand; if (!actionId) throw new Error('Usage: munin execute <action-id> <outcome>'); return console.log(await service.execute(actionId, args.join(' ') || 'Completed')); }
  if (command === 'job' && subcommand === 'add') { const [company, role, ...description] = args; if (!company || !role) throw new Error('Usage: munin job add <company> <role> [description]'); return console.log(await service.addJob(company, role, description.join(' '))); }
  if (command === 'job' && subcommand === 'list') return console.log(JSON.stringify(await service.listJobs(), null, 2));
  if (command === 'job' && subcommand === 'update') { const [jobId, status, ...nextAction] = args; if (!jobId || !status) throw new Error('Usage: munin job update <job-id> <status> [next-action]'); return console.log(await service.updateJob(jobId, status as JobStatus, nextAction.join(' ') || undefined)); }
  if (command === 'job' && subcommand === 'touch') { const [jobId, ...note] = args; if (!jobId) throw new Error('Usage: munin job touch <job-id> [note]'); return console.log(await service.touchJob(jobId, note.join(' ') || undefined)); }
  if (command === 'job' && subcommand === 'close') { const [jobId, status, ...reason] = args; if (!jobId || !['rejected', 'closed'].includes(status) || !reason.length) throw new Error('Usage: munin job close <job-id> <rejected|closed> <reason>'); return console.log(await service.closeJob(jobId, status as 'rejected' | 'closed', reason.join(' '))); }
  console.log(`Munin v0.4\n\nCommands:\n  sitrep [--since <ISO-date>]\n  career sitrep\n  career queue\n  job touch <job-id> [note]\n  job close <job-id> <rejected|closed> <reason>\n  context inspect\n  context export\n  context related <entity-id>\n  relation add <source-type> <source-id> <relation-type> <target-type> <target-id>\n  project list\n  project add [P0|P1|P2] <name>\n  project update <project-id> <status> [next-action]\n  decision add <title>\n  decision resolve <decision-id> <accepted|rejected> [rationale]\n  action add [P0|P1|P2] <title>\n  execute <action-id> <outcome>\n  job add <company> <role> [description]\n  job list\n  job update <job-id> <status> [next-action]`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
