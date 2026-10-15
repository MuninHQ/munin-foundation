export type EvidenceStatus = 'PROVEN' | 'ASSUMPTION' | 'TEST' | 'INVALID';
export type OfferReadiness = 'READY_TO_TEST' | 'NEEDS_EVIDENCE' | 'BLOCKED';

export interface OfferEvidence {
  id: string;
  source: string;
  detail: string;
  url?: string;
}

export interface OfferClaimInput {
  id: string;
  claim: string;
  evidenceIds?: string[];
  status?: EvidenceStatus;
}

export interface OfferBonusInput {
  name: string;
  purpose: string;
  objection?: string;
}

export interface OfferGuaranteeInput {
  text: string;
  evidenceIds?: string[];
  conditions?: string[];
}
export interface OfferScarcityInput {
  type: 'none' | 'capacity' | 'deadline' | 'inventory';
  detail?: string;
  evidenceIds?: string[];
}

export interface OfferAlternativeInput {
  name: string;
  note?: string;
  price?: string;
}

export interface OfferArchitectInput {
  id?: string;
  productService: string;
  avatar: string;
  pain: string;
  dreamOutcome: string;
  mechanism?: string;
  currentAttempts?: string[];
  objections?: string[];
  constraints?: string[];
  coreDeliverables?: string[];
  bonuses?: OfferBonusInput[];
  guarantee?: OfferGuaranteeInput;
  scarcity?: OfferScarcityInput;
  evidence?: OfferEvidence[];
  claims?: OfferClaimInput[];
  alternatives?: OfferAlternativeInput[];
  dreamOutcomeStrength: number;
  perceivedLikelihood: number;
  timeDelay: number;
  effortAndSacrifice: number;
  timeToValueDays?: number;
  priceHypothesis?: {
    amount?: number;
    currency?: string;
    billing?: string;
    note?: string;
  };
}

export interface EvidenceGateItem {
  id: string;
  claim: string;
  status: EvidenceStatus;
  evidence: OfferEvidence[];
  rationale: string;
}

export interface QualityCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}
export interface ValidationExperiment {
  id: string;
  targetClaimId: string;
  hypothesis: string;
  method: string;
  successSignal: string;
}

export interface OfferArchitectResult {
  id: string;
  generatedAt: string;
  positioning: string;
  valueEquation: {
    dreamOutcome: number;
    perceivedLikelihood: number;
    timeDelay: number;
    effortAndSacrifice: number;
    rawValue: number;
  };
  valueMap: {
    desiredOutcome: string;
    pain: string;
    currentAttempts: string[];
    objections: string[];
    constraints: string[];
  };
  offerStack: {
    core: string[];
    bonuses: OfferBonusInput[];
    guarantee?: OfferGuaranteeInput;
    scarcity?: OfferScarcityInput;
  };
  evidenceGate: EvidenceGateItem[];
  qualityGate: {
    readiness: OfferReadiness;
    score: number;
    publishSafe: boolean;
    checks: QualityCheck[];
    blockers: string[];
  };
  pricing: {
    status: 'ASSUMPTION';
    hypothesis?: OfferArchitectInput['priceHypothesis'];
    note: string;
  };
  researchPlan: {
    alternatives: OfferAlternativeInput[];
    queries: string[];
  };
  validationExperiments: ValidationExperiment[];
}

const clean = (value?: string): string => value?.trim() ?? '';
const cleanList = (values?: string[]): string[] =>
  [...new Set((values ?? []).map(clean).filter(Boolean))];
const clampScore = (value: number, field: string): number => {
  if (!Number.isFinite(value)) throw new Error(field + ' must be a number.');
  if (value < 1 || value > 10) throw new Error(field + ' must be between 1 and 10.');
  return Number(value.toFixed(2));
};
function validateInput(input: OfferArchitectInput): OfferArchitectInput {
  const required: Array<[string, string]> = [
    ['productService', input.productService],
    ['avatar', input.avatar],
    ['pain', input.pain],
    ['dreamOutcome', input.dreamOutcome],
  ];
  for (const [field, value] of required) {
    if (!clean(value)) throw new Error(field + ' is required.');
  }
  return {
    ...input,
    productService: clean(input.productService),
    avatar: clean(input.avatar),
    pain: clean(input.pain),
    dreamOutcome: clean(input.dreamOutcome),
    mechanism: clean(input.mechanism) || undefined,
    currentAttempts: cleanList(input.currentAttempts),
    objections: cleanList(input.objections),
    constraints: cleanList(input.constraints),
    coreDeliverables: cleanList(input.coreDeliverables),
    dreamOutcomeStrength: clampScore(input.dreamOutcomeStrength, 'dreamOutcomeStrength'),
    perceivedLikelihood: clampScore(input.perceivedLikelihood, 'perceivedLikelihood'),
    timeDelay: clampScore(input.timeDelay, 'timeDelay'),
    effortAndSacrifice: clampScore(input.effortAndSacrifice, 'effortAndSacrifice'),
  };
}
function gateClaim(
  claim: OfferClaimInput,
  evidenceById: Map<string, OfferEvidence>,
): EvidenceGateItem {
  const refs = cleanList(claim.evidenceIds);
  const evidence = refs.map(id => evidenceById.get(id)).filter((item): item is OfferEvidence => Boolean(item));
  const requested = claim.status ?? (evidence.length ? 'PROVEN' : 'ASSUMPTION');
  if (requested === 'INVALID') {
    return { id: claim.id, claim: clean(claim.claim), status: 'INVALID', evidence, rationale: 'Claim was explicitly marked invalid.' };
  }
  if (requested === 'PROVEN' && evidence.length === 0) {
    return { id: claim.id, claim: clean(claim.claim), status: 'TEST', evidence, rationale: 'PROVEN requires linked evidence; downgraded to TEST.' };
  }
  if (requested === 'PROVEN') {
    return { id: claim.id, claim: clean(claim.claim), status: 'PROVEN', evidence, rationale: 'Linked evidence is present. Keep source quality under review.' };
  }
  if (requested === 'TEST') {
    return { id: claim.id, claim: clean(claim.claim), status: 'TEST', evidence, rationale: 'Claim requires a validation experiment before use as fact.' };
  }
  return { id: claim.id, claim: clean(claim.claim), status: 'ASSUMPTION', evidence, rationale: 'Treat as a working hypothesis until tested.' };
}
function buildEvidenceGate(input: OfferArchitectInput): EvidenceGateItem[] {
  const evidenceById = new Map((input.evidence ?? []).map(item => [item.id, item]));
  const claims = [...(input.claims ?? [])];
  if (!claims.some(item => item.id === 'dream-outcome')) {
    claims.push({
      id: 'dream-outcome',
      claim: 'Target customer can achieve: ' + input.dreamOutcome,
      status: 'ASSUMPTION',
    });
  }
  if (input.guarantee?.text) {
    claims.push({
      id: 'guarantee',
      claim: input.guarantee.text,
      evidenceIds: input.guarantee.evidenceIds,
      status: (input.guarantee.evidenceIds?.length ?? 0) > 0 ? 'PROVEN' : 'TEST',
    });
  }
  if (input.scarcity && input.scarcity.type !== 'none') {
    const scarcityEvidence = cleanList(input.scarcity.evidenceIds);
    const hasValidScarcityEvidence = scarcityEvidence.some(id => evidenceById.has(id));
    claims.push({
      id: 'scarcity',
      claim: input.scarcity.detail || ('Scarcity is based on ' + input.scarcity.type + '.'),
      evidenceIds: scarcityEvidence,
      status: hasValidScarcityEvidence ? 'PROVEN' : 'INVALID',
    });
  }
  return claims.map(claim => gateClaim(claim, evidenceById));
}
function buildExperiments(gate: EvidenceGateItem[]): ValidationExperiment[] {
  return gate
    .filter(item => item.status === 'ASSUMPTION' || item.status === 'TEST')
    .map((item, index) => ({
      id: 'exp-' + String(index + 1).padStart(2, '0'),
      targetClaimId: item.id,
      hypothesis: item.claim,
      method: 'Run a low-cost validation: 5-10 target-customer interviews or a small manual concierge/smoke test. Do not present the claim as proven.',
      successSignal: 'Repeated, observable evidence from the target customer or measured test behavior supports the claim.',
    }));
}

function buildResearchQueries(input: OfferArchitectInput): string[] {
  const base = [
    input.avatar + ' alternatives to ' + input.productService,
    input.avatar + ' ' + input.pain + ' existing solutions',
    input.avatar + ' ' + input.dreamOutcome + ' buying criteria',
  ];
  for (const alternative of input.alternatives ?? []) {
    base.push(alternative.name + ' pricing positioning reviews');
  }
  return cleanList(base);
}
function qualityChecks(
  input: OfferArchitectInput,
  gate: EvidenceGateItem[],
  bonuses: OfferBonusInput[],
): QualityCheck[] {
  const proven = gate.filter(item => item.status === 'PROVEN').length;
  const invalid = gate.filter(item => item.status === 'INVALID').length;
  const objectionKeys = new Set(cleanList(input.objections).map(value => value.toLowerCase()));
  const mappedBonuses = bonuses.filter(bonus => bonus.objection && objectionKeys.has(clean(bonus.objection).toLowerCase())).length;
  const hasDifferentiation = Boolean(input.mechanism) || (input.alternatives?.length ?? 0) > 0;
  const valueShape = input.dreamOutcomeStrength >= 6
    && input.perceivedLikelihood >= 5
    && input.timeDelay <= 7
    && input.effortAndSacrifice <= 7;
  const riskSupported = !input.guarantee?.text || gate.find(item => item.id === 'guarantee')?.status === 'PROVEN';
  const scarcityHonest = !input.scarcity
    || input.scarcity.type === 'none'
    || gate.find(item => item.id === 'scarcity')?.status === 'PROVEN';

  return [
    { id: 'clarity', label: 'Clear customer, pain and outcome', pass: true, detail: input.avatar + ' → ' + input.dreamOutcome },
    { id: 'value-equation', label: 'Value equation shape', pass: valueShape, detail: valueShape ? 'Outcome/likelihood are strong relative to delay/effort.' : 'Improve likelihood or outcome, or reduce delay/effort.' },
    { id: 'differentiation', label: 'Differentiation', pass: hasDifferentiation, detail: hasDifferentiation ? 'Mechanism or alternatives context is present.' : 'Add a mechanism or compare against real alternatives.' },
    { id: 'objections', label: 'Objection coverage', pass: objectionKeys.size === 0 || mappedBonuses >= Math.ceil(objectionKeys.size / 2), detail: objectionKeys.size === 0 ? 'No objections supplied.' : mappedBonuses + '/' + objectionKeys.size + ' objections mapped to purposeful bonuses.' },
    { id: 'proof', label: 'Proof', pass: proven > 0, detail: proven > 0 ? proven + ' claim(s) have linked evidence.' : 'No claim is evidenced yet.' },
    { id: 'risk', label: 'Risk reversal is supportable', pass: riskSupported, detail: riskSupported ? 'No unsupported guarantee detected.' : 'Guarantee needs evidence or must be softened.' },
    { id: 'honesty', label: 'Scarcity and claims are honest', pass: invalid === 0 && scarcityHonest, detail: invalid === 0 && scarcityHonest ? 'No invalid claim or fake scarcity detected.' : 'Invalid or unsupported scarcity/claim detected.' },
  ];
}

function buildPositioning(input: OfferArchitectInput): string {
  const mechanism = input.mechanism ? ' via ' + input.mechanism : '';
  return input.productService + ' for ' + input.avatar + ': ' + input.dreamOutcome + mechanism + '.';
}

export function buildOfferArchitecture(raw: OfferArchitectInput): OfferArchitectResult {
  const input = validateInput(raw);
  const bonuses = (input.bonuses ?? [])
    .map(item => ({ name: clean(item.name), purpose: clean(item.purpose), objection: clean(item.objection) || undefined }))
    .filter(item => item.name && item.purpose);
  const gate = buildEvidenceGate(input);
  const checks = qualityChecks(input, gate, bonuses);
  const blockers = checks.filter(check => !check.pass).map(check => check.label + ': ' + check.detail);
  const invalid = gate.some(item => item.status === 'INVALID');
  const unresolved = gate.some(item => item.status === 'ASSUMPTION' || item.status === 'TEST');
  const readiness: OfferReadiness = invalid ? 'BLOCKED' : (unresolved || blockers.length > 0) ? 'NEEDS_EVIDENCE' : 'READY_TO_TEST';
  const score = Math.round((checks.filter(check => check.pass).length / checks.length) * 100);
  const rawValue = Number(((input.dreamOutcomeStrength * input.perceivedLikelihood)
    / (input.timeDelay * input.effortAndSacrifice)).toFixed(3));
  const core = cleanList(input.coreDeliverables);
  if (core.length === 0) core.push(input.productService);

  return {
    id: input.id?.trim() || 'offer-' + Date.now().toString(36),
    generatedAt: new Date().toISOString(),
    positioning: buildPositioning(input),
    valueEquation: {
      dreamOutcome: input.dreamOutcomeStrength,
      perceivedLikelihood: input.perceivedLikelihood,
      timeDelay: input.timeDelay,
      effortAndSacrifice: input.effortAndSacrifice,
      rawValue,
    },
    valueMap: {
      desiredOutcome: input.dreamOutcome,
      pain: input.pain,
      currentAttempts: input.currentAttempts ?? [],
      objections: input.objections ?? [],
      constraints: input.constraints ?? [],
    },
    offerStack: {
      core,
      bonuses,
      guarantee: input.guarantee?.text ? input.guarantee : undefined,
      scarcity: input.scarcity,
    },
    evidenceGate: gate,
    qualityGate: {
      readiness,
      score,
      publishSafe: !invalid
        && gate.length > 0
        && gate.every(item => item.status === 'PROVEN')
        && (!input.scarcity || input.scarcity.type === 'none' || gate.find(item => item.id === 'scarcity')?.status === 'PROVEN'),
      checks,
      blockers,
    },
    pricing: {
      status: 'ASSUMPTION',
      hypothesis: input.priceHypothesis,
      note: 'Price/packaging remains a hypothesis until tested with real buyers or observed transactions.',
    },
    researchPlan: {
      alternatives: input.alternatives ?? [],
      queries: buildResearchQueries(input),
    },
    validationExperiments: buildExperiments(gate),
  };
}
