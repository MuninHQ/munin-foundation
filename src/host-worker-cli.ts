import { resolve } from 'node:path';
import { HostBridgeWorker } from './host-bridge-worker.js';
import { GitHubHostInbox } from './github-host-inbox.js';

const once = process.argv.includes('--once');
const githubInboxEnabled = process.argv.includes('--github-inbox') || process.env.MUNIN_HOST_GITHUB_INBOX === '1';
const intervalArg = process.argv.find(arg => arg.startsWith('--interval='));
const requested = intervalArg ? Number(intervalArg.split('=')[1]) : 5000;
const intervalMs = Number.isFinite(requested) ? Math.max(1000, Math.min(60000, requested)) : 5000;
const queuePath = resolve(process.cwd(), 'data', 'runtime', 'host-bridge-queue.json');
const worker = new HostBridgeWorker({ queuePath });
const githubInbox = githubInboxEnabled ? new GitHubHostInbox(worker.queue) : undefined;
let stopping = false;

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

async function pollRemote():Promise<void>{
 if(!githubInbox)return;
 const result=await githubInbox.poll();
 if(!['empty','replayed'].includes(result.status))process.stdout.write(JSON.stringify({source:'github-host-inbox',...result})+'\n');
}

async function main(): Promise<void> {
  if (once) {
    await pollRemote();
    const processed = await worker.runUntilEmpty();
    process.stdout.write(JSON.stringify({ mode:'once', processed, queuePath, githubInbox:githubInboxEnabled }) + '\n');
    return;
  }

  process.stdout.write(JSON.stringify({ mode:'continuous', intervalMs, queuePath, githubInbox:githubInboxEnabled }) + '\n');
  while (!stopping) {
    try { await pollRemote(); await worker.runUntilEmpty(); }
    catch (error) { process.stderr.write(JSON.stringify({ status:'worker-error', summary:error instanceof Error ? error.message : String(error) }) + '\n'); }
    if (!stopping) await new Promise(resolveTimer => setTimeout(resolveTimer, intervalMs));
  }
}

main().catch(error => {
  process.stderr.write(JSON.stringify({ status:'failed', summary:error instanceof Error ? error.message : String(error) }) + '\n');
  process.exitCode = 1;
});
