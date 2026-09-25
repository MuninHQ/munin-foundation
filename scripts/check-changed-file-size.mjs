import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const maxLines = Number.parseInt(process.env.MAX_LINES ?? '350', 10);
const baseRef = process.env.BASE_REF ?? 'origin/main';
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

if (!Number.isFinite(maxLines) || maxLines < 1) {
  console.error(`Invalid MAX_LINES value: ${process.env.MAX_LINES}`);
  process.exit(2);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

let changed = [];
try {
  const mergeBase = git(['merge-base', baseRef, 'HEAD']);
  changed = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD'])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
} catch (error) {
  console.error(`Unable to determine changed files against ${baseRef}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const candidates = changed.filter((path) => allowedExtensions.has(extname(path)));
const oversized = [];

for (const path of candidates) {
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    continue;
  }

  const lines = content === '' ? 0 : content.split(/\r?\n/).length;
  if (lines > maxLines) oversized.push({ path, lines });
}

if (oversized.length > 0) {
  console.error(`Changed source files must stay at or below ${maxLines} lines unless intentionally refactored before merge:`);
  for (const item of oversized) console.error(`- ${item.path}: ${item.lines} lines`);
  console.error('This gate applies only to files changed by the PR so legacy large files can be reduced incrementally.');
  process.exit(1);
}

console.log(`File-size gate passed: ${candidates.length} changed source file(s), MAX_LINES=${maxLines}.`);
