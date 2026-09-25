import { pathToFileURL } from 'node:url';
import { OrchestrationTraceStore } from './orchestration-trace-store.js';
import type { TokenGovernorObservation } from './token-governor.js';
import { summarizeTokenGovernorObservations, TokenGovernorStore } from './token-governor-store.js';

interface ObservationSource {
  list(): Promise<TokenGovernorObservation[]>;
}

export async function tokenGovernorStatus(
  source: ObservationSource = new TokenGovernorStore(),
  traceStore = new OrchestrationTraceStore(),
) {
  const dedicated = await source.list();
  const observations = dedicated.length
    ? dedicated
    : (await traceStore.list(1000)).flatMap(trace => trace.tokenGovernor ? [trace.tokenGovernor] : []);
  return {
    mode: 'shadow' as const,
    savingsKind: 'estimated-avoidable-context-tokens' as const,
    metrics: summarizeTokenGovernorObservations(observations),
    limitations: [
      'Token counts use a local four-Unicode-code-points-per-token heuristic.',
      'Savings are potential context reduction, not realized provider billing savings.',
      'Recommendations are observation-only and never change provider, model, or reasoning effort.',
    ],
    promotionRequired: 'Explicit approval plus representative production evidence, summary-quality review, tokenizer calibration, and unchanged safety/promotion gates are required before promotion.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await tokenGovernorStatus(), null, 2));
}
