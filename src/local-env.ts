import { readFileSync } from 'node:fs';
import path from 'node:path';

export function loadLocalEnv(filePath = path.resolve('.env')): void {
  try {
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      const doubleQuoted = value.startsWith('"') && value.endsWith('"');
      const singleQuoted = value.startsWith("'") && value.endsWith("'");
      if (doubleQuoted || singleQuoted) value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Local .env is optional; production can provide environment variables directly.
  }
}

loadLocalEnv();
