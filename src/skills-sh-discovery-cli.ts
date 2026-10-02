import { formatSkillsShDiscoveryReport, runSkillsShDiscovery } from './skills-sh-discovery.js';

const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined;
const query = args.filter(arg => !arg.startsWith('--')).join(' ').trim();

if (!query) {
  console.error('Usage: npm run skills:discover -- "query" [--limit=8]');
  process.exitCode = 2;
} else {
  try {
    const report = await runSkillsShDiscovery({ query, limit });
    console.log(formatSkillsShDiscoveryReport(report));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
