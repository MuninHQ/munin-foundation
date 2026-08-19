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
  recentTitles?: string[];
};

export type BrandEvaluation = {
  score: number;
  publish: boolean;
  reasons: string[];
  matchedTheses: BrandThesis[];
  repetitionRisk: number;
  distinctiveness: "weak" | "credible" | "owned";
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

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const DOMAIN_ALIASES: Record<string, string[]> = {
  product: ["product", "produto", "roadmap", "discovery"],
  innovation: ["innovation", "inovacao", "inovar"],
  infrastructure: ["infrastructure", "infraestrutura", "settlement", "liquidacao", "rails", "trilhos", "rsfn", "post trade"],
  payments: ["payments", "pagamentos", "payment", "pix"],
  "digital-assets": ["digital assets", "ativos digitais", "tokenizacao", "tokenization", "drex", "blockchain", "dlt"],
  stablecoins: ["stablecoin", "stablecoins"],
  ai: ["ai", "ia", "inteligencia artificial", "artificial intelligence", "agentes"],
  execution: ["execution", "execucao", "producao", "production", "operating model", "implementacao"],
  regulation: ["regulation", "regulacao", "regulatorio", "regulatory", "governanca", "governance", "compliance"],
  "open-finance": ["open finance", "open banking"],
  identity: ["digital identity", "identidade digital", "identity"]
};

function domainMatches(haystack: string, domain: string) {
  const aliases = DOMAIN_ALIASES[domain] ?? [domain, domain.replace(/-/g, " ")];
  return aliases.some((alias) => (` ${haystack} `).includes(` ${normalize(alias)} `) || haystack.includes(normalize(alias)));
}

function tokenSet(value: string) {
  return new Set(normalize(value).split(" ").filter((token) => token.length >= 4));
}

function titleSimilarity(a: string, b: string) {
  const left = tokenSet(a), right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap++;
  return overlap / Math.max(left.size, right.size);
}

export function evaluateBrandCandidate(candidate: ContentCandidate, profile: BrandProfile = andreBrandProfile): BrandEvaluation {
  const haystack = normalize(`${candidate.topic} ${candidate.angle}`);
  const matchedTheses = profile.theses.filter((thesis) => {
    if (candidate.thesisIds?.includes(thesis.id)) return true;
    return thesis.domains.some((domain) => domainMatches(haystack, domain));
  });

  const genericSignals = [
    /\b\d+ trends?\b/,
    /\b\d+ tendencias\b/,
    /revolucion(ar|ando|a)/,
    /transformando tudo/,
    /voce precisa saber/,
    /game changer/,
    /futuro chegou/
  ];
  const genericHit = genericSignals.some((pattern) => pattern.test(haystack));
  const repetitionRisk = Math.round(Math.max(0, ...(candidate.recentTitles ?? []).map((title) => titleSimilarity(candidate.topic, title))) * 100);
  const reasons: string[] = [];
  let score = 42;

  if (matchedTheses.length) {
    score += Math.min(32, matchedTheses.length * 11);
    reasons.push(`reinforces ${matchedTheses.map((item) => item.id).join(", ")}`);
  } else {
    reasons.push("does not yet connect to an owned thesis");
  }

  if (candidate.source) {
    score += 14;
    reasons.push("has a source/evidence anchor");
  } else {
    reasons.push("needs a source/evidence anchor");
  }

  if (/infraestrutura|infrastructure|governanca|governance|interoper|liquidacao|settlement|execucao|execution|produto|product/.test(haystack)) {
    score += 8;
    reasons.push("connects technology to product/infrastructure execution");
  }

  if (genericHit) {
    score -= 24;
    reasons.push("uses a generic thought-leadership pattern");
  }

  if (repetitionRisk >= 70) {
    score -= 28;
    reasons.push(`high repetition risk (${repetitionRisk}%)`);
  } else if (repetitionRisk >= 45) {
    score -= 12;
    reasons.push(`moderate repetition risk (${repetitionRisk}%)`);
  } else if ((candidate.recentTitles ?? []).length) {
    reasons.push(`low repetition risk (${repetitionRisk}%)`);
  }

  score = Math.max(0, Math.min(100, score));
  const distinctiveness: BrandEvaluation["distinctiveness"] = score >= 82 && matchedTheses.length ? "owned" : score >= 65 ? "credible" : "weak";
  return { score, publish: score >= 70 && !genericHit && repetitionRisk < 70, reasons, matchedTheses, repetitionRisk, distinctiveness };
}

export function brandPromptContext(profile: BrandProfile = andreBrandProfile) {
  return {
    tribe: profile.tribe,
    manifesto: profile.manifesto,
    positioning: profile.positioning,
    permissionGoal: profile.permissionGoal,
    authorityGoal: profile.authorityGoal,
    ownedTheses: profile.theses.filter((thesis) => thesis.status === "active").map((thesis) => `${thesis.id}: ${thesis.statement}`),
    editorialGuardrails: [
      "Do not summarize news when a non-obvious product or infrastructure implication can be explained.",
      "Connect emerging technology to production, governance, interoperability, trust or execution.",
      "Prefer a defensible point of view over hype or generic trend commentary.",
      "Do not repeat a recent thesis unless the new evidence materially advances or challenges it."
    ]
  };
}

export function authorityFlywheel() {
  return ["insight", "recognition", "follow", "recurring-exposure", "conversation", "professional-opportunity"] as const;
}
