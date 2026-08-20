import { syncCareerInbox } from './email-providers.js';
import { refreshEmailIntelligence } from './email-intelligence.js';

async function main(): Promise<void> {
  const sync = await syncCareerInbox();
  const intelligence = await refreshEmailIntelligence();
  process.stdout.write(JSON.stringify({ sync, intelligence }, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
  process.exitCode = 1;
});
