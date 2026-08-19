export interface ControlPlaneDecision {
  id: string;
  decision: string;
  context: string;
  rationale: string;
  alternativesConsidered: string[];
  affectedRefs: string[];
  source: string;
  decidedAt: string;
  supersedes?: string;
  supersededBy?: string;
}

function required(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} is required.`);
}

export function createControlPlaneDecision(
  input: Omit<ControlPlaneDecision, 'decidedAt' | 'supersededBy'> & { decidedAt?: string },
): ControlPlaneDecision {
  required(input.id, 'Decision id');
  required(input.decision, 'Decision');
  required(input.context, 'Decision context');
  required(input.rationale, 'Decision rationale');
  required(input.source, 'Decision source');

  return {
    ...input,
    alternativesConsidered: [...input.alternativesConsidered],
    affectedRefs: [...input.affectedRefs],
    decidedAt: input.decidedAt ?? new Date().toISOString(),
  };
}

export function supersedeControlPlaneDecision(
  previous: ControlPlaneDecision,
  next: ControlPlaneDecision,
): [ControlPlaneDecision, ControlPlaneDecision] {
  if (previous.id === next.id) throw new Error('A decision cannot supersede itself.');
  if (previous.supersededBy) throw new Error(`Decision ${previous.id} is already superseded.`);
  if (next.supersedes && next.supersedes !== previous.id) {
    throw new Error(`Decision ${next.id} declares a different superseded decision.`);
  }

  return [
    { ...previous, supersededBy: next.id },
    { ...next, supersedes: previous.id },
  ];
}

export function activeControlPlaneDecisions(decisions: readonly ControlPlaneDecision[]): ControlPlaneDecision[] {
  return decisions.filter((decision) => !decision.supersededBy);
}
