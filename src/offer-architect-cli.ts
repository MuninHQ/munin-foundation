import { readFile } from 'node:fs/promises';
import { buildOfferArchitecture, type OfferArchitectInput } from './offer-architect.js';

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: npm run offer:architect -- <offer-input.json>');
  }
  const input = JSON.parse(await readFile(file, 'utf8')) as OfferArchitectInput;
  const result = buildOfferArchitecture(input);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
