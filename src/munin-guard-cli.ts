import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assessMuninGuard, formatMuninGuardReport, parseMuninGuardManifest } from './munin-guard.js';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const pathArg = args.find(arg => !arg.startsWith('--'));

if (!pathArg) {
  console.error('Usage: npm run guard -- <manifest.json> [--json]');
  process.exitCode = 2;
} else {
  try {
    const raw = await readFile(resolve(pathArg), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const manifest = parseMuninGuardManifest(parsed);
    const result = assessMuninGuard(manifest);
    console.log(jsonOutput ? JSON.stringify(result, null, 2) : formatMuninGuardReport(result));
    if (result.decision === 'BLOCK') process.exitCode = 3;
    else if (result.decision === 'REVIEW') process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
