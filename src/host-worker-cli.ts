import { resolve } from 'node:path';
import { HostBridgeWorker } from './host-bridge-worker.js';
import { GitHubHostInbox } from './github-host-inbox.js';
import { GitHubHostOutbox } from './github-host-outbox.js';
import { syncCareerGitHubIssues } from './career-github-issue-sync.js';

const once = process.argv.includes('--once');
const githubInboxEnabled = process.argv.includes('--github-inbox') || process.env.MUNIN_HOST_GITHUB_INBOX === '1';
const intervalArg = process.argv.find(arg => arg.startsWith('--interval='));
const requested = intervalArg ? Number(intervalArg.split('=')[1]) : 5000;
const intervalMs = Number.isFinite(requested) ? Math.max(1000, Math.min(60000, requested)) : 5000;
const queuePath = resolve(process.cwd(), 'data', 'runtime', 'host-bridge-queue.json');
const worker = new HostBridgeWorker({ queuePath });
const githubInbox = githubInboxEnabled ? new GitHubHostInbox(worker.queue) : undefined;
const githubOutbox = githubInboxEnabled ? new GitHubHostOutbox() : undefined;
const careerGitHubEnabled = process.env.MUNIN_CAREER_GITHUB_SYNC === '1';
const CAREER_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let lastCareerSyncAt = 0;
let stopping = false;

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

async function pollRemote():Promise<void>{
 if(!githubInbox)return;
 const result=await githubInbox.poll();
 if(!['empty','replayed'].includes(result.status))process.stdout.write(JSON.stringify({source:'github-host-inbox',...result})+'\n');
}

async function pollCareerInbox(): Promise<void> {
  if (!careerGitHubEnabled || Date.now() - lastCareerSyncAt < CAREER_SYNC_INTERVAL_MS) return;
  lastCareerSyncAt = Date.now();
  try {
    const result = await syncCareerGitHubIssues();
    if (result.added || result.updated) process.stdout.write(JSON.stringify({ source: 'career-github-inbox', ...result }) + '\n');
  } catch (error) {
    // A private inbox outage must never block other Host Worker jobs or leak credentials.
    process.stderr.write(JSON.stringify({ source: 'career-github-inbox', status: 'unavailable', summary: error instanceof Error ? error.message : 'Sync failed' }) + '\n');
  }
}

async function publishReceipts():Promise<void>{if(!githubOutbox)return;const published=await githubOutbox.publishPending(await worker.queue.list());if(published)process.stdout.write(JSON.stringify({source:'github-host-outbox',published})+'\n')}

async function main(): Promise<void> {
  if (once) {
    await pollRemote();
    await pollCareerInbox();
    const processed = await worker.runUntilEmpty();
    await publishReceipts();
    process.stdout.write(JSON.stringify({ mode:'once', processed, queuePath, githubInbox:githubInboxEnabled }) + '\n');
    return;
  }

  process.stdout.write(JSON.stringify({ mode:'continuous', intervalMs, queuePath, githubInbox:githubInboxEnabled }) + '\n');
  while (!stopping) {
    try { await pollRemote(); await pollCareerInbox(); await worker.runUntilEmpty(); await publishReceipts(); }
    catch (error) { process.stderr.write(JSON.stringify({ status:'worker-error', summary:error instanceof Error ? error.message : String(error) }) + '\n'); }
    if (!stopping) await new Promise(resolveTimer => setTimeout(resolveTimer, intervalMs));
  }
}

main().catch(error => {
  process.stderr.write(JSON.stringify({ status:'failed', summary:error instanceof Error ? error.message : String(error) }) + '\n');
  process.exitCode = 1;
});
