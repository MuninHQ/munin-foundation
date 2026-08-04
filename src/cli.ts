#!/usr/bin/env node
import { MuninService } from './service.js';
import type { JobStatus, Priority, Status } from './types.js';

const service = new MuninService();
const [command, subcommand, ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  if (command === 'sitrep') return console.log(await service.sitrep());
  if (command === 'career' && subcommand === 'sitrep') return console.log(await service.careerSitrep());
  if (command === 'context' && subcommand === 'inspect') return console.log(await service.inspect());
  if (command === 'context' && subcommand === 'export') return console.log(await service.exportContext());

  if (command === 'project' && subcommand === 'list') return console.log(JSON.stringify(await service.listProjects(), null, 2));
  if (command === 'project' && subcommand === 'add') {
    const priority = (args[0]?.match(/^P[0-2]$/) ? args.shift() : 'P1') as Priority;
    return console.log(await service.addProject(args.join(' '), priority));
  }
  if (command === 'project' && subcommand === 'update') {
    const [projectId, status, ...nextAction] = args;
    if (!projectId || !status) throw new Error('Usage: munin project update <project-id> <status> [next-action]');
    return console.log(await service.updateProject(projectId, status as Status, nextAction.join(' ') || undefined));
  }

  if (command === 'decision' && subcommand === 'add') return console.log(await service.addDecision(args.join(' ')));
  if (command === 'decision' && subcommand === 'resolve') {
    const [decisionId, status, ...rationale] = args;
    if (!decisionId || !['accepted', 'rejected'].includes(status)) throw new Error('Usage: munin decision resolve <decision-id> <accepted|rejected> [rationale]');
    return console.log(await service.resolveDecision(decisionId, status as 'accepted' | 'rejected', rationale.join(' ') || undefined));
  }

  if (command === 'action' && subcommand === 'add') {
    const priority = (args[0]?.match(/^P[0-2]$/) ? args.shift() : 'P1') as Priority;
    return console.log(await service.addAction(args.join(' '), priority));
  }
  if (command === 'execute') {
    const actionId = subcommand;
    if (!actionId) throw new Error('Usage: munin execute <action-id> <outcome>');
    return console.log(await service.execute(actionId, args.join(' ') || 'Completed'));
  }

  if (command === 'job' && subcommand === 'add') {
    const [company, role, ...description] = args;
    if (!company || !role) throw new Error('Usage: munin job add <company> <role> [description]');
    return console.log(await service.addJob(company, role, description.join(' ')));
  }
  if (command === 'job' && subcommand === 'list') return console.log(JSON.stringify(await service.listJobs(), null, 2));
  if (command === 'job' && subcommand === 'update') {
    const [jobId, status, ...nextAction] = args;
    if (!jobId || !status) throw new Error('Usage: munin job update <job-id> <status> [next-action]');
    return console.log(await service.updateJob(jobId, status as JobStatus, nextAction.join(' ') || undefined));
  }

  console.log(`Munin v0.1

Commands:
  sitrep
  career sitrep
  context inspect
  context export
  project list
  project add [P0|P1|P2] <name>
  project update <project-id> <status> [next-action]
  decision add <title>
  decision resolve <decision-id> <accepted|rejected> [rationale]
  action add [P0|P1|P2] <title>
  execute <action-id> <outcome>
  job add <company> <role> [description]
  job list
  job update <job-id> <status> [next-action]`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
