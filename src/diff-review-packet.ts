import type { EfficiencyBuildState } from './efficiency-build-state.js';
import { reduceCommandOutput } from './token-governor.js';
import { redactSecretText } from './secret-redaction.js';

export interface DiffReviewPacketInput {
  objective: string;
  constraints: string[];
  buildState: EfficiencyBuildState;
  affected: Array<{ path: string; patch: string }>;
  unrelatedDirtyPaths: string[];
  tests: Array<{ command: string; outcome: 'passed' | 'failed' | 'not-run'; summary: string }>;
  maxChars?: number;
}
export interface DiffReviewPacket { text: string; includedFiles: number; omittedHunks: number; originalChars: number; retainedChars: number; }

export function buildDiffReviewPacket(input: DiffReviewPacketInput): DiffReviewPacket {
  const affected = input.affected.slice(0, 20);
  const raw = [
    '# DIFF-FIRST REVIEW', `Objective: ${input.objective}`, 'Constraints:', ...input.constraints.map(item => `- ${item}`),
    'Build State:', JSON.stringify(input.buildState, null, 2), 'Affected diffs:',
    ...affected.flatMap(item => [`## ${item.path}`, item.patch]),
    'Unrelated dirty paths (contents excluded):', ...input.unrelatedDirtyPaths.slice(0, 100).map(item => `- ${item}`),
    'Verification:', ...input.tests.map(item => `- [${item.outcome}] ${item.command}: ${item.summary}`),
  ].join('\n');
  const safe = redactSecretText(raw);
  const maxChars = Math.max(1000, Math.min(100_000, input.maxChars ?? 24_000));
  const reduced = reduceCommandOutput({ output: safe, exitCode: 0, kind: 'command' }, { largeOutputChars: maxChars, maxSummaryChars: maxChars, prefixChars: Math.floor(maxChars * 0.45), suffixChars: Math.floor(maxChars * 0.45) });
  return { text: reduced.summary, includedFiles: affected.length, omittedHunks: Math.max(0, input.affected.length - affected.length), originalChars: raw.length, retainedChars: reduced.summary.length };
}
