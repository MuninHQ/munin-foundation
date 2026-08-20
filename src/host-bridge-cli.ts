import { readFile } from 'node:fs/promises';
import { HostBridgeExecutor } from './host-bridge-executor.js';
import { LocalHostAdapter } from './local-host-adapter.js';
import type { HostJob } from './host-bridge-protocol.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const fileIndex = process.argv.indexOf('--file');
  const raw = fileIndex >= 0 && process.argv[fileIndex + 1]
    ? await readFile(process.argv[fileIndex + 1], 'utf8')
    : await readStdin();
  if (!raw.trim()) throw new Error('Host Bridge requires one typed JSON job on stdin or --file.');

  const parsed = JSON.parse(raw) as HostJob;
  const executor = new HostBridgeExecutor(new LocalHostAdapter());
  const result = await executor.execute(parsed);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.status === 'blocked' || result.status === 'failed') process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(JSON.stringify({ status:'failed', summary:error instanceof Error ? error.message : String(error) }) + '\n');
  process.exitCode = 1;
});
