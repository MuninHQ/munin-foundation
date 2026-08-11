/**
 * Central configuration for the Munin workspace.
 *
 * Every port, path and origin used by the local runtime is resolved here so
 * that behaviour is consistent across modules and overridable from a single
 * set of environment variables:
 *
 *   MUNIN_DATA_DIR   — root directory for runtime state (default: data/runtime)
 *   MUNIN_API_PORT   — unified local API port            (default: 4310)
 *   MUNIN_WEB_PORT   — web UI (vite) port                (default: 5173)
 *
 * All values are resolved lazily so tests can set environment variables at
 * runtime before touching any store.
 */
import path from 'node:path';

export function dataDir(): string {
  return process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime');
}

/** Absolute path for a file or directory inside the runtime data dir. */
export function runtimePath(...segments: string[]): string {
  return path.join(dataDir(), ...segments);
}

export function apiPort(): number {
  return Number(process.env.MUNIN_API_PORT ?? 4310);
}

export function webPort(): number {
  return Number(process.env.MUNIN_WEB_PORT ?? 5173);
}

/** Base URL of the local API (used for OAuth redirects and asset links). */
export function apiBaseUrl(): string {
  return `http://127.0.0.1:${apiPort()}`;
}

/** Base URL of the web UI (used for post-OAuth redirects back to the app). */
export function webBaseUrl(): string {
  return `http://127.0.0.1:${webPort()}`;
}

/**
 * Origins allowed to call the local API from a browser. The Munin API holds
 * personal data and provider credentials, so CORS is restricted to the local
 * web UI instead of `*`.
 */
export function allowedWebOrigins(): string[] {
  const port = webPort();
  return [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    apiBaseUrl(),
    `http://localhost:${apiPort()}`,
  ];
}
