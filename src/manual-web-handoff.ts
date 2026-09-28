import { randomUUID } from 'node:crypto';
import type { EfficiencyBuildState } from './efficiency-build-state.js';
import { redactSecretText } from './secret-redaction.js';
import { estimateTokens } from './token-governor.js';

export type LauncherState = { status: 'available' | 'unavailable' | 'unknown'; url?: string; guidance?: string };
export interface ManualWebHandoffInput { objective: string; constraints: string[]; buildState?: EfficiencyBuildState; selectedContext: Array<{ path: string; excerpt: string }>; responseContract: string; launcher: LauncherState; maxChars?: number; }
export interface ManualWebPacket { id: string; mode: 'copy-only' | 'copy-and-open'; text: string; chars: number; estimatedTokens: number; launcher: LauncherState; preparedAt: string; boundary: 'manual-only-no-response-ingestion'; }

function safeLauncher(input: LauncherState): LauncherState {
  let url: string | undefined;
  if (input.url) { const parsed = new URL(input.url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('launcher URL must use http or https'); url = parsed.toString(); }
  return { status: input.status, url, guidance: input.guidance ? redactSecretText(input.guidance).slice(0, 500) : undefined };
}
export function prepareManualWebHandoff(input: ManualWebHandoffInput): ManualWebPacket {
  const launcher = safeLauncher(input.launcher);
  const maxChars = Math.max(1000, Math.min(100_000, Math.floor(input.maxChars ?? 20_000)));
  const raw = ['MUNIN CODEX WEB ZERO RISK — MANUAL ONLY', 'The operator must paste and send this packet manually.', 'No browser automation, DOM access, response extraction, or limit bypass is authorized.', '', `OBJECTIVE\n${input.objective}`, '', 'CONSTRAINTS', ...input.constraints.map(item => `- ${item}`), '', 'BUILD STATE', JSON.stringify(input.buildState ?? null, null, 2), '', 'SELECTED CONTEXT', ...input.selectedContext.flatMap(item => [`## ${item.path}`, item.excerpt]), '', `RESPONSE CONTRACT\n${input.responseContract}`].join('\n');
  const text = redactSecretText(raw).slice(0, maxChars);
  return { id: `manual-web-${randomUUID().slice(0, 8)}`, mode: launcher.status === 'available' && launcher.url ? 'copy-and-open' : 'copy-only', text, chars: text.length, estimatedTokens: estimateTokens(text), launcher, preparedAt: new Date().toISOString(), boundary: 'manual-only-no-response-ingestion' };
}
