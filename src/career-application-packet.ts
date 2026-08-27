import { contextBriefForConsumer } from './context-memory.js';
import { ContextStore } from './store.js';
import type { JobOpportunity } from './types.js';

export type CareerApplicationDecision = 'CANDIDATAR' | 'AVALIAR' | 'NAO_PRIORIZAR';

export interface CareerProfileEvidence {
  path: string;
  fact: string;
  matchedTerms: string[];
}

export interface CareerApplicationPacket {
  schemaVersion: 1;
  jobId: string;
  company: string;
  role: string;
  fitScore: number;
  decision: CareerApplicationDecision;
  generatedAt: string;
  positioning: {
    headline: string;
    thesis: string;
  };
  cv: {
    atsKeywords: string[];
    evidencePrompts: string[];
    profileEvidence: CareerProfileEvidence[];
  };
  coverLetter: {
    draft: string;
    placeholders: string[];
  };
  interview: {
    focusAreas: string[];
    starPrompts: string[];
    questionsToAsk: string[];
  };
  risks: string[];
  nextActions: string[];
  safeguards: {
    status: 'draft';
    humanReviewRequired: true;
    automaticSubmission: false;
    externalWriteAuthorized: false;
    claimsPolicy: string;
  };
  provenance: {
    source?: string;
    sourceUrl?: string;
    jobUpdatedAt: string;
    contextKeys: string[];
    staleContextKeys: string[];
  };
}

const KEYWORDS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'product strategy', pattern: /product strategy|estrat[eé]gia de produto/i },
  { label: 'product management', pattern: /product management|gest[aã]o de produto/i },
  { label: 'payments', pattern: /payments?|pagamentos?/i },
  { label: 'open finance', pattern: /open finance|open banking/i },
  { label: 'digital assets', pattern: /digital assets?|ativos? digitais?/i },
  { label: 'stablecoins', pattern: /stablecoins?/i },
  { label: 'blockchain / DLT', pattern: /blockchain|\bdlt\b|distributed ledger/i },
  { label: 'artificial intelligence', pattern: /artificial intelligence|intelig[eê]ncia artificial|\bai\b/i },
  { label: 'digital identity', pattern: /digital identity|identidade digital/i },
  { label: 'cybersecurity', pattern: /cybersecurity|ciberseguran[cç]a/i },
  { label: 'regulatory strategy', pattern: /regulatory|regulat[oó]ri[oa]|compliance/i },
  { label: 'stakeholder management', pattern: /stakeholders?|gest[aã]o de stakeholders?/i },
  { label: 'leadership', pattern: /leadership|lideran[cç]a|people management/i },
  { label: 'implementation', pattern: /implementation|implementa[cç][aã]o|delivery|execu[cç][aã]o/i },
];

const STOP_WORDS = new Set([
  'para', 'com', 'uma', 'por', 'dos', 'das', 'que', 'and', 'the', 'with', 'from', 'into', 'this', 'that',
  'vaga', 'role', 'cargo', 'company', 'empresa', 'senior', 'manager', 'management', 'product', 'produto',
]);
const SENSITIVE_KEY = /(?:cpf|rg|document|passport|email|phone|telefone|address|endere[cç]o|salary|sal[aá]rio|remunera[cç][aã]o|token|secret|password|credential|api.?key)/i;
const SENSITIVE_VALUE = /(?:[\w.+-]+@[\w.-]+\.\w{2,}|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|(?:bearer|token|secret|password|api.?key)\s*[:=])/i;

function compact(value: string, limit = 320): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function normalized(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function tokens(value: string): string[] {
  return [...new Set(normalized(value).split(/[^a-z0-9]+/).filter(token => token.length > 2 && !STOP_WORDS.has(token)))];
}

function unique(values: string[], limit = values.length): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = compact(raw, 120);
    const key = normalized(value);
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function flattenProfessionalFacts(value: unknown, prefix = 'career', depth = 0, output: Array<{ path: string; fact: string }> = []): Array<{ path: string; fact: string }> {
  if (depth > 5 || output.length >= 120) return output;
  if (typeof value === 'string') {
    const fact = compact(value);
    if (fact.length >= 12 && !SENSITIVE_VALUE.test(fact)) output.push({ path: prefix, fact });
    return output;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) flattenProfessionalFacts(value[index], `${prefix}[${index}]`, depth + 1, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) continue;
    flattenProfessionalFacts(child, `${prefix}.${key}`, depth + 1, output);
  }
  return output;
}

function profileEvidence(context: Record<string, unknown>, job: JobOpportunity, terms: string[]): CareerProfileEvidence[] {
  const career = context.career;
  if (!career) return [];
  const jobTokens = new Set(tokens(`${job.role} ${job.description ?? ''} ${terms.join(' ')}`));
  const termTokens = new Map(terms.map(term => [term, tokens(term)]));
  return flattenProfessionalFacts(career).map(item => {
    const factTokens = new Set(tokens(item.fact));
    const matchedTerms = terms.filter(term => (termTokens.get(term) ?? []).some(token => factTokens.has(token)));
    const overlap = [...jobTokens].filter(token => factTokens.has(token)).length;
    return { ...item, matchedTerms, score: overlap + matchedTerms.length * 3 };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .filter((item, index, all) => all.findIndex(candidate => normalized(candidate.fact) === normalized(item.fact)) === index)
    .slice(0, 6)
    .map(({ path, fact, matchedTerms }) => ({ path, fact, matchedTerms }));
}

function applicationTerms(job: JobOpportunity): string[] {
  const corpus = `${job.role}\n${job.description ?? ''}`;
  const discovered = KEYWORDS.filter(item => item.pattern.test(corpus)).map(item => item.label);
  return unique([...(job.matchedSignals ?? []), ...discovered], 10);
}

function list(values: string[]): string {
  if (!values.length) return 'requisitos profissionais a validar';
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(', ')} e ${values.at(-1)}`;
}

function decisionFor(score: number): CareerApplicationDecision {
  if (score >= 70) return 'CANDIDATAR';
  if (score >= 40) return 'AVALIAR';
  return 'NAO_PRIORIZAR';
}

export function buildCareerApplicationPacket(
  job: JobOpportunity,
  context: Record<string, unknown> = {},
  options: { generatedAt?: string; staleContextKeys?: string[] } = {},
): CareerApplicationPacket {
  const company = compact(job.company, 160) || 'Empresa a confirmar';
  const role = compact(job.role, 160) || 'Cargo a confirmar';
  const terms = applicationTerms(job);
  const evidence = profileEvidence(context, job, terms);
  const decision = decisionFor(job.fitScore);
  const risks: string[] = [];
  if (!job.description?.trim()) risks.push('Descrição completa da vaga não está persistida; palavras-chave e requisitos podem estar incompletos.');
  if (!terms.length) risks.push('Nenhum requisito aderente foi extraído; revise a vaga antes de personalizar materiais.');
  if (!evidence.length) risks.push('Nenhuma evidência profissional governada foi vinculada automaticamente; preencha apenas com casos reais.');
  if (job.fitScore < 70) risks.push(`Aderência atual de ${job.fitScore}% exige revisão antes de investir em uma candidatura completa.`);
  if (options.staleContextKeys?.length) risks.push(`Contexto temporal precisa ser atualizado antes de ação externa: ${options.staleContextKeys.join(', ')}.`);

  const focus = list(terms.slice(0, 5));
  const evidencePrompts = (terms.length ? terms : ['requisito central da vaga']).slice(0, 6).map(term =>
    `Inserir um caso real de ${term}: problema, sua decisão, stakeholders, execução e resultado mensurável.`,
  );
  const starPrompts = (terms.length ? terms : ['escopo principal']).slice(0, 4).map(term =>
    `Preparar STAR sobre ${term}, separando contexto, responsabilidade pessoal, decisão e evidência do resultado.`,
  );
  const placeholders = [
    'Motivação específica e verificável para a empresa.',
    'Um caso profissional com escopo e resultado mensurável.',
    'Nome, contatos e despedida final antes do envio.',
  ];
  const draft = [
    `À equipe de recrutamento da ${company},`,
    '',
    `Tenho interesse na posição de ${role}. A aderência identificada está concentrada em ${focus}.`,
    'Minha versão final desta carta deve demonstrar essa conexão somente com casos profissionais verificáveis, deixando claro o problema, minha responsabilidade, a decisão tomada e o resultado observado.',
    '',
    '[INSERIR: caso profissional mais aderente, com escopo e resultado mensurável.]',
    `[INSERIR: por que o contexto da ${company} e desta posição justificam a candidatura agora.]`,
    '',
    'Fico à disposição para aprofundar essas experiências em uma conversa.',
    '',
    '[REVISAR: nome e contato antes do envio]',
  ].join('\n');

  return {
    schemaVersion: 1,
    jobId: job.id,
    company,
    role,
    fitScore: job.fitScore,
    decision,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    positioning: {
      headline: `${role} · ${company} · foco em ${focus}`,
      thesis: 'Conectar cada requisito priorizado a uma evidência profissional real, sem ampliar senioridade, escopo ou resultados além do que estiver documentado.',
    },
    cv: {
      atsKeywords: terms,
      evidencePrompts,
      profileEvidence: evidence,
    },
    coverLetter: { draft, placeholders },
    interview: {
      focusAreas: terms.slice(0, 6),
      starPrompts,
      questionsToAsk: [
        'Quais resultados definem sucesso nos primeiros 90 e 180 dias?',
        'Qual é o nível de autonomia da posição e quais decisões ela realmente possui?',
        'Quais stakeholders e dependências mais influenciam a execução?',
        'Qual problema fez esta posição se tornar prioridade agora?',
      ],
    },
    risks,
    nextActions: [
      'Validar os requisitos críticos e completar as evidências com casos reais.',
      'Adaptar somente as seções do CV que aumentem clareza e relevância; não inventar palavras-chave ou resultados.',
      'Substituir todos os placeholders e revisar tom, fatos e contatos.',
      'Aprovar manualmente o pacote antes de qualquer candidatura ou envio externo.',
    ],
    safeguards: {
      status: 'draft',
      humanReviewRequired: true,
      automaticSubmission: false,
      externalWriteAuthorized: false,
      claimsPolicy: 'Nenhuma afirmação pode ser enviada sem evidência profissional real e revisão humana.',
    },
    provenance: {
      source: job.source,
      sourceUrl: job.link,
      jobUpdatedAt: job.updatedAt,
      contextKeys: context.career ? ['career'] : [],
      staleContextKeys: options.staleContextKeys ?? [],
    },
  };
}

export async function loadCareerApplicationPacket(jobId: string, store = new ContextStore()): Promise<CareerApplicationPacket> {
  const normalizedId = jobId.trim();
  if (!normalizedId) throw new Error('jobId is required');
  const [state, memory] = await Promise.all([store.load(), contextBriefForConsumer('career')]);
  const job = state.jobs.find(item => item.id === normalizedId);
  if (!job) throw new Error('Job opportunity not found');
  return buildCareerApplicationPacket(job, memory.context, { staleContextKeys: memory.governance.stale });
}
