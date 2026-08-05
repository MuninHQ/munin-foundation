#!/usr/bin/env node
import path from 'node:path';
import { TransactionalOutbox } from './outbox.js';
import { analyzeOutbox, formatOutboxReport } from './outbox-operations.js';

const root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime');
const outbox = new TransactionalOutbox(root);
const [command, entryId] = process.argv.slice(2);

async function main(): Promise<void> {
  if (command === 'status' || !command) {
    const metrics = analyzeOutbox(await outbox.list());
    console.log(formatOutboxReport(metrics));
    return;
  }
  if (command === 'json') {
    console.log(JSON.stringify(analyzeOutbox(await outbox.list()), null, 2));
    return;
  }
  if (command === 'list') {
    console.log(JSON.stringify(await outbox.list(), null, 2));
    return;
  }
  if (command === 'requeue') {
    if (!entryId) throw new Error('Usage: outbox-ops requeue <entry-id>');
    console.log(JSON.stringify(await outbox.requeueDeadLetter(entryId), null, 2));
    return;
  }
  throw new Error('Usage: outbox-ops <status|json|list|requeue <entry-id>>');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
