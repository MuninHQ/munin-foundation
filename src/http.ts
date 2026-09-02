/**
 * Shared HTTP helpers for every Munin API handler.
 *
 * Previously each API module (core, visual assets, composer, context memory,
 * executive briefing) carried its own copy of these functions with `*` CORS.
 * This module is the single source of truth for JSON responses, request-body
 * parsing, input validation and the (restricted) CORS policy.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { allowedWebOrigins } from './config.js';

const MAX_BODY_BYTES = 6_000_000;

function corsHeaders(request: IncomingMessage): Record<string, string> {
  const origin = request.headers.origin;
  if (!origin || !allowedWebOrigins().includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    vary: 'origin',
  };
}

export class JsonBodyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonBodyValidationError';
  }
}

/** Send a JSON response with the local CORS policy applied. */
export function json(request: IncomingMessage, response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(request) });
  response.end(JSON.stringify(body));
}

/** Send raw bytes (images, downloads) with the local CORS policy applied. */
export function bytes(
  request: IncomingMessage,
  response: ServerResponse,
  payload: Buffer,
  headers: Record<string, string>,
): void {
  response.writeHead(200, { ...headers, ...corsHeaders(request) });
  response.end(payload);
}

/** Send a 302 redirect. */
export function redirect(response: ServerResponse, url: string): void {
  response.writeHead(302, { location: url });
  response.end();
}

/** Read and parse a JSON object body, with a payload-size guard. */
export async function readJsonBody(request: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > maxBytes) throw new JsonBodyValidationError('Payload too large');
    chunks.push(value);
  }
  if (!chunks.length) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new JsonBodyValidationError('Invalid JSON body');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new JsonBodyValidationError('JSON object body required');
  return parsed as Record<string, unknown>;
}

/** Require a non-empty trimmed string field. */
export function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

/** Coerce an unknown value into a clean string array. */
export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean)
    : [];
}

/** Optional string helper: returns trimmed string or undefined. */
export function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
