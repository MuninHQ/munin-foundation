export interface EmailInterestResult { score:number; reasons:string[] }

const TOPICS:Array<[RegExp,string,number]>=[
  [/\b(artificial intelligence|intelig[eê]ncia artificial|\bAI\b|machine learning|agentic|agents?)\b/i,'AI / automation',3],
  [/\b(digital assets?|ativos digitais|blockchain|stablecoins?|tokeniza(?:tion|ção)|crypto|drex)\b/i,'digital assets',4],
  [/\b(open finance|open banking|payments?|pagamentos?|pix|financial infrastructure|infraestrutura financeira)\b/i,'financial infrastructure',4],
  [/\b(regulation|regulatory|regula(?:ção|tory)|banco central|central bank|bacen|bcb|anbima|b3)\b/i,'regulation / market infrastructure',4],
  [/\b(product management|product strategy|produto|roadmap|discovery)\b/i,'product / strategy',2],
  [/\b(report|research|white ?paper|study|estudo|insight|outlook|market update)\b/i,'research / market update',2],
  [/\b(invitation|invite|convite|webinar|conference|confer[eê]ncia|roundtable|evento)\b/i,'event / invitation',1],
];

const LOW_VALUE=/\b(unsubscribe|marketing offer|cupom|desconto|promoção|promotion|newsletter daily|digest diário)\b/i;

export function scoreEmailInterest(input:{subject:string;snippet:string;fromEmail?:string}):EmailInterestResult{
  const text=`${input.subject}\n${input.snippet}\n${input.fromEmail??''}`;
  if(LOW_VALUE.test(text)) return {score:0,reasons:['low-value promotional signal']};
  const reasons:string[]=[];let score=0;
  for(const [pattern,label,weight] of TOPICS){if(pattern.test(text)){score+=weight;reasons.push(label)}}
  return {score:Math.min(10,score),reasons:[...new Set(reasons)]};
}
