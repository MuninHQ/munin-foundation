export type BrandThesis = {
  id: string;
  statement: string;
  domains: string[];
  status: "seed" | "active" | "retired";
};

export type BrandProfile = {
  tribe: string;
  manifesto: string;
  positioning: string;
  permissionGoal: string;
  authorityGoal: string;
  antiPatterns: string[];
  theses: BrandThesis[];
};

export type ContentCandidate = {
  topic: string;
  angle: string;
  source?: string;
  thesisIds?: string[];
};

export type BrandEvaluation = {
  score: number;
  publish: boolean;
  reasons: string[];
  matchedTheses: BrandThesis[];
};

export const andreBrandProfile: BrandProfile = {
  tribe: "People building the next generation of financial infrastructure who believe innovation must survive the transition from PowerPoint to production.",
  manifesto: "The future of finance will not be built by choosing between old infrastructure and new. It will be built by people who know how to connect both.",
  positioning: "A financial-services product and innovation leader connecting production-grade banking infrastructure with emerging technology across payments, Open Finance, digital assets, AI, digital identity and market infrastructure.",
  permissionGoal: "When Andre publishes about financial infrastructure, digital assets, AI or product strategy, the audience expects a useful, non-obvious perspective worth reading.",
  authorityGoal: "Build recognizable executive authority at the intersection of financial infrastructure, product leadership and emerging technology.",
  antiPatterns: [
    "generic AI is transforming banking commentary",
    "generic blockchain will revolutionize finance commentary",
    "trend listicles without an original thesis",
    "hype without production, governance or infrastructure implications",
    "repeating a recent thesis without a materially new angle"
  ],
  theses: [
    { id: "THESIS-001", statement: "Innovation must survive production.", domains: ["product", "innovation", "infrastructure"], status: "active" },
    { id: "THESIS-002", statement: "New rails do not automatically replace old rails.", domains: ["payments", "infrastructure", "digital-assets"], status: "active" },
    { id: "THESIS-003", statement: "Stablecoins do not replace financial infrastructure; they pressure it to evolve.", domains: ["stablecoins", "payments", "infrastructure"], status: "active" },
    { id: "THESIS-004", statement: "AI models commoditize; integration and execution create durable advantage.", domains: ["ai", "product", "execution"], status: "active" },
    { id: "THESIS-005", statement: "The interesting part of digital assets begins where technology meets infrastructure.", domains: ["digital-assets", "infrastructure", "regulation"], status: "active" }
  ]
};

const normalize = (value: string) => value.toLowerCase();

export function evaluateBrandCandidate(candidate: ContentCandidate, profile: BrandProfile = andreBrandProfile): BrandEvaluation {
  const haystack = normalize(`${candidate.topic} ${candidate.angle}`);
  const matchedTheses = profile.theses.filter((thesis) => {
    if (candidate.thesisIds?.includes(thesis.id)) return true;
    return thesis.domains.some((domain) => haystack.includes(normalize(domain.replace("-", " "))) || haystack.includes(normalize(domain)));
  });

  const antiPatternHits = profile.antiPatterns.filter((pattern) => haystack.includes(normalize(pattern)));
  const reasons: string[] = [];
  let score = 45;

  if (matchedTheses.length) {
    score += Math.min(30, matchedTheses.length * 10);
    reasons.push(`reinforces ${matchedTheses.map((item) => item.id).join(", ")}`);
  } else {
    reasons.push("does not yet connect to an owned thesis");
  }

  if (candidate.source) {
    score += 15;
    reasons.push("has a source/evidence anchor");
  } else {
    reasons.push("needs a source/evidence anchor");
  }

  if (antiPatternHits.length) {
    score -= 25;
    reasons.push("contains a generic-brand anti-pattern");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, publish: score >= 70 && antiPatternHits.length === 0, reasons, matchedTheses };
}

export function authorityFlywheel() {
  return ["insight", "recognition", "follow", "recurring-exposure", "conversation", "professional-opportunity"] as const;
}
