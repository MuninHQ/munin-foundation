import { RuntimeCapabilityRegistry, type CapabilityExecutionContext } from './runtime-capability-seam.js';
import type { ExternalIntelligenceProvider } from './external-intelligence-capability.js';
import { HttpExternalIntelligenceProvider, LocalExternalIntelligenceProvider } from './external-intelligence-capability.js';

export interface IndependentReviewInput {
  objective: string;
  implementationSummary: string;
  changedFiles?: string[];
  tests?: string[];
  evidence?: string[];
  acceptanceCriteria?: string[];
}

export interface ReviewFinding {
  severity: 'info' | 'warning' | 'critical';
  area: string;
  finding: string;
  recommendation?: string;
}

export interface IndependentReviewOutput {
  reviewer: string;
  verdict: 'approve' | 'approve_with_notes' | 'changes_required' | 'unavailable';
  summary: string;
  findings: ReviewFinding[];
  independent: boolean;
}

function localReview(input: IndependentReviewInput): IndependentReviewOutput {
  const findings: ReviewFinding[] = [];
  if (!input.tests?.length) findings.push({ severity: 'warning', area: 'tests', finding: 'No test evidence was supplied.', recommendation: 'Run targeted tests before completion.' });
  if (!input.acceptanceCriteria?.length) findings.push({ severity: 'warning', area: 'acceptance', finding: 'No explicit acceptance criteria were supplied.', recommendation: 'Verify the implementation against explicit completion criteria.' });
  if (!input.changedFiles?.length) findings.push({ severity: 'info', area: 'scope', finding: 'Changed-file scope was not supplied.' });
  return {
    reviewer: 'local-independent-gate',
    verdict: findings.some(item => item.severity === 'critical') ? 'changes_required' : findings.length ? 'approve_with_notes' : 'approve',
    summary: findings.length ? 'Local independent gate found review notes.' : 'Local independent gate found no obvious review gaps.',
    findings,
    independent: true,
  };
}

export function registerIndependentReviewCapability(
  registry: RuntimeCapabilityRegistry,
  providers: ExternalIntelligenceProvider[] = [new HttpExternalIntelligenceProvider(), new LocalExternalIntelligenceProvider()],
): void {
  registry.register<IndependentReviewInput, IndependentReviewOutput>({
    name: 'engineering.independent-review',
    async execute(input: IndependentReviewInput, _context: CapabilityExecutionContext<IndependentReviewInput>) {
      if (!input.objective?.trim()) throw new Error('Review objective is required.');
      if (!input.implementationSummary?.trim()) throw new Error('Implementation summary is required.');

      for (const provider of providers) {
        if (provider.name === 'local-fallback') continue;
        if (!(await provider.available())) continue;
        const external = await provider.execute({
          objective: `Independently review this engineering change. Return concise findings and a verdict. Objective: ${input.objective}`,
          mode: 'analysis',
          context: input as unknown as Record<string, unknown>,
          requireCitations: false,
        });
        return {
          reviewer: external.provider,
          verdict: 'approve_with_notes',
          summary: external.summary,
          findings: external.evidence.map(item => ({ severity: 'info' as const, area: 'external-evidence', finding: item.excerpt ?? item.title ?? item.url ?? 'External review evidence.' })),
          independent: true,
        };
      }

      return localReview(input);
    },
  });
}
