import { runtimePath } from './config.js';
import { assessCapability, type CapabilityAssessment } from './capability-radar.js';
import { discoverGitHubCapabilities, type DiscoveredCapability } from './capability-radar-github.js';
import { collectDuplicationEvidence } from './capability-duplication.js';
import { JsonCapabilityDecisionLog, type PersistedCapabilityDecision } from './json-capability-decision-log.js';

export interface CapabilityRadarRunOptions {
  query: string;
  limit?: number;
  revisit?: boolean;
  fetcher?: typeof fetch;
  log?: JsonCapabilityDecisionLog;
  root?: string;
  duplicationCollector?: typeof collectDuplicationEvidence;
}

export interface CapabilityRadarRunResult {
  query: string;
  discovered: number;
  assessed: number;
  skipped: number;
  adopt: number;
  review: number;
  reject: number;
  decisions: PersistedCapabilityDecision[];
  skippedIds: string[];
}

export async function runCapabilityRadar(options: CapabilityRadarRunOptions): Promise<CapabilityRadarRunResult> {
  const discovered: DiscoveredCapability[] = await discoverGitHubCapabilities({ query: options.query, limit: options.limit, fetcher: options.fetcher });
  const log = options.log ?? new JsonCapabilityDecisionLog(runtimePath('capability-radar-decisions.json'));
  const decisions: PersistedCapabilityDecision[] = [];
  const skippedIds: string[] = [];
  const duplicationCollector=options.duplicationCollector??collectDuplicationEvidence;

  for (const item of discovered) {
    if (!options.revisit && !(await log.shouldReassess(item.candidate.id))) {
      skippedIds.push(item.candidate.id);
      continue;
    }
    const duplication=await duplicationCollector(item.candidate,options.root??process.cwd());
    const enriched={...item.candidate,duplicationScore:duplication.score,evidence:[...(item.candidate.evidence??[]),...duplication.matches.map(match=>`Munin duplication match: ${match}`)]};
    const assessment: CapabilityAssessment = assessCapability(enriched);
    decisions.push(await log.record(assessment));
  }

  return {
    query: options.query,
    discovered: discovered.length,
    assessed: decisions.length,
    skipped: skippedIds.length,
    adopt: decisions.filter(item => item.decision === 'adopt').length,
    review: decisions.filter(item => item.decision === 'review').length,
    reject: decisions.filter(item => item.decision === 'reject').length,
    decisions,
    skippedIds,
  };
}

export function formatCapabilityRadarReport(result: CapabilityRadarRunResult): string {
  const lines = [
    `Capability Radar: ${result.query}`,
    `Discovered: ${result.discovered} · Assessed: ${result.assessed} · Skipped known: ${result.skipped}`,
    `Adopt: ${result.adopt} · Review: ${result.review} · Reject: ${result.reject}`,
  ];
  for (const decision of result.decisions) lines.push(`- ${decision.id}: ${decision.decision.toUpperCase()} (${decision.score}) — ${decision.reasons.join('; ')}`);
  if (result.skippedIds.length) lines.push(`Known decisions skipped: ${result.skippedIds.join(', ')}`);
  return lines.join('\n');
}
