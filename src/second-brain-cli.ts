import { commitAfterTask, recallBeforeTask, secondBrainStatus } from './second-brain.js';

function value(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function list(args: string[], flag: string): string[] | undefined {
  const raw = value(args, flag);
  return raw?.split('|').map(item => item.trim()).filter(Boolean);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'status';

  if (command === 'status') {
    console.log(JSON.stringify(await secondBrainStatus(), null, 2));
    return;
  }

  if (command === 'recall') {
    const task = value(args, '--task') ?? args.slice(1).join(' ').trim();
    if (!task) throw new Error('Uso: second-brain recall --task "..." [--project munin]');
    console.log(JSON.stringify(await recallBeforeTask({ task, project: value(args, '--project') }), null, 2));
    return;
  }

  if (command === 'commit') {
    const task = value(args, '--task');
    const summary = value(args, '--summary');
    if (!task || !summary) throw new Error('Uso: second-brain commit --task "..." --summary "..." [--project munin]');
    console.log(JSON.stringify(await commitAfterTask({
      task,
      summary,
      project: value(args, '--project'),
      decisions: list(args, '--decisions'),
      changed: list(args, '--changed'),
      nextSteps: list(args, '--next'),
      failed: list(args, '--failed'),
      tags: list(args, '--tags'),
    }), null, 2));
    return;
  }

  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
