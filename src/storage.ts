/**
 * Small storage helpers shared by every runtime store.
 *
 * - `readJsonFile` centralises the "read JSON or fall back" pattern.
 * - `writeJsonAtomic` makes every persisted write crash-safe: the payload is
 *   written to a temporary file and renamed into place, so a crash mid-write
 *   can never leave a half-written `state.json` behind.
 */
import { mkdir, rename, unlink, writeFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

/** Read and parse a JSON file, returning `fallback()` when missing/corrupt. */
export async function readJsonFile<T>(file: string, fallback: () => T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return fallback();
  }
}

/** Atomically write a JSON value (write to temp file, then rename). */
export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  try {
    await rename(tmp, file);
  } catch (error) {
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
}
