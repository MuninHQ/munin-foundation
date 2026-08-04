#!/usr/bin/env node
import { MuninService } from './service.js';
import type { Priority } from './types.js';

const service = new MuninService();
const [command, subcommand, ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  if (command === 'sitrep') return console.log(await service.sitrep());
  if (command === 'context' && subcommand === 'inspect') return console.log(await service.inspect());
  if (command === 'project' && subcommand === 'list') return console.log(JSON.stringify(await service.listProjects(), null, 2));
  if (command === 'decision' && subcommand === 'add') return console.log(await service.addDecision(args.join(' ')));
  if (command === 'action' && subcommand === 'add') {
    const priority = (args[0]?.match(/^P[0-2]$/) ? args.shift() : 'P1') as Priority;
    return console.log(await service.addAction(args.join(' '), priority));
  }
  if (command === 'execute') {
    const actionId = subcommand; if (!actionId) throw new Error('Usage: munin execute <action-id> <outcome>');
    return console.log(await service.execute(actionId, args.join(' ') || 'Completed'));
  }
  console.log('Munin v0.1\n\nCommands:\n  sitrep\n  context inspect\n  project list\n  decision add <title>\n  action add [P0|P1|P2] <title>\n  execute <action-id> <outcome>');
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
