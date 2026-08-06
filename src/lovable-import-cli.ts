import { readFile } from 'node:fs/promises';
import { commitLovableImport, previewLovableImport, type LovableSnapshot } from './lovable-import.js';
import { ContextStore } from './store.js';

async function main(): Promise<void> {
  const file = process.argv[2]; const mode = process.argv.includes('--commit') ? 'commit' : 'preview';
  if (!file) throw new Error('Usage: npm run import:lovable -- <snapshot.json> [--commit]');
  const snapshot = JSON.parse(await readFile(file,'utf8')) as LovableSnapshot;
  const store = new ContextStore();
  const result = mode === 'commit' ? await commitLovableImport(snapshot,store) : previewLovableImport(snapshot,await store.load());
  console.log(JSON.stringify({ mode, ...result },null,2));
  if (mode === 'preview') console.log('\nPreview only. Run again with --commit to write data.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
