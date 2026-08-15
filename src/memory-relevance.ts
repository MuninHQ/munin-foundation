import type { MemoryInput } from './continuity-memory.js';

export type RelevanceDecision='keep'|'review'|'drop';
export type RelevanceResult={decision:RelevanceDecision;score:number;reasons:string[]};

const durable=[
 /\b(munin|aip|projeto|roadmap|backlog|arquitetura|github|build|deploy|decisão|definimos)\b/i,
 /\b(vaga|carreira|currículo|entrevista|recrutador|salário|febraban|bank of america|citibank|b3|linkedin)\b/i,
 /\b(meta|objetivo|prioridade|preferência|prefiro|quero que você|não quero|sempre faça|nunca faça)\b/i,
 /\b(família|filhos|esposa|patrimônio|carro|moradia|finanças)\b/i,
];
const ephemeral=[
 /\b(night\s*crows?|rf online|legends of ymir|path of exile|gunner|archer|healer|farm spot|pve|pvp)\b/i,
 /\b(filme|série|cena pós.?crédito|música|cerveja|chopp|clima|tempo hoje)\b/i,
];
const durableIntent=/\b(decidi|decidimos|fica decidido|lembre|guardar|manter|daqui pra frente|sempre|nunca|preferência|objetivo|meta)\b/i;
const durableKinds=new Set(['preference','goal','decision','project','career']);

export function memoryRelevance(record:MemoryInput):RelevanceResult{
 const text=`${record.subject}\n${record.content}\n${record.tags.join(' ')}`;let score=0.35;const reasons:string[]=[];
 for(const rule of durable)if(rule.test(text)){score+=0.22;reasons.push('durable-domain')}
 if(durableKinds.has(record.kind)){score+=record.kind==='career'?0.1:0.18;reasons.push(`durable-kind:${record.kind}`)}
 const casual=ephemeral.some(rule=>rule.test(text));if(casual){score-=0.42;reasons.push('ephemeral-domain')}
 if(casual&&durableIntent.test(text)){score+=0.5;reasons.push('durable-intent-overrides-ephemeral')}
 score=Math.max(0,Math.min(1,score));return {score,decision:score>=0.8?'keep':score>=0.55?'review':'drop',reasons:[...new Set(reasons)]};
}

export function filterRelevantMemories(records:MemoryInput[]){const kept:MemoryInput[]=[];const review:MemoryInput[]=[];let dropped=0;for(const record of records){const result=memoryRelevance(record);const tagged={...record,tags:[...new Set([...record.tags,`relevance:${result.decision}`]) ]};if(result.decision==='keep')kept.push(tagged);else if(result.decision==='review')review.push(tagged);else dropped++;}return {kept,review,dropped};}
