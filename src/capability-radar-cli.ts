import { formatCapabilityRadarReport, runCapabilityRadar } from './capability-radar-service.js';

const args = process.argv.slice(2);
const revisit = args.includes('--revisit');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined;
const query = args.filter(arg => !arg.startsWith('--')).join(' ').trim();

if (!query) {
  console.error('Usage: npm run capability:radar -- "query" [--limit=5] [--revisit]');
  process.exitCode = 2;
} else {
  try {
    const result = await runCapabilityRadar({ query, limit, revisit });
    console.log(formatCapabilityRadarReport(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
