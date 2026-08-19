import { readFile } from 'node:fs/promises';
import { ProblemInterviewStore, type ProblemInterviewRecord } from './problem-interviews.js';

async function main() {
  const [command = 'report', file] = process.argv.slice(2);
  const store = new ProblemInterviewStore();
  if (command === 'report') {
    console.log(JSON.stringify(await store.report(), null, 2));
    return;
  }
  if (command === 'add') {
    if (!file) throw new Error('Usage: npm run research:problem-interviews -- add <interview.json>');
    const record = JSON.parse(await readFile(file, 'utf8')) as ProblemInterviewRecord;
    console.log(JSON.stringify(await store.add(record), null, 2));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
