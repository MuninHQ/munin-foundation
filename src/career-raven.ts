import type { CareerEmail } from './career-inbox.js';
import type { JobOpportunity } from './types.js';
import { extractJobDiscoveries, type JobDiscovery } from './job-discovery.js';

export type CareerRavenDecision='APPLY_NOW'|'REVIEW'|'SKIP'|'ALREADY_APPLIED';
export interface CareerRavenRecommendation{ id:string; title:string; company?:string; score:number; decision:CareerRavenDecision; reasons:string[]; sourceMessageId?:string; duplicateJobId?:string; }
export interface CareerRavenSnapshot{ generatedAt:string; applied:Array<{company?:string;role?:string;subject:string;receivedAt:string}>; recommendations:CareerRavenRecommendation[]; }

const positive=['stablecoin','digital assets','blockchain','open finance','open banking','payments','payment','fintech','product','strategy','innovation','artificial intelligence',' ai ','identity','infrastructure','manager','gerente','principal','lead'];
const negative=['junior','jr','analyst 1','analista pleno','assessment specialist','quality & training','assessor de investimentos','kyc operations analyst'];
function norm(v:string){return ` ${v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')} `}
function strategicScore(discovery:JobDiscovery):{score:number;reasons:string[]}{const text=norm(`${discovery.title} ${discovery.company??''} ${discovery.signals.join(' ')}`);let score=discovery.score;const reasons=[...discovery.signals.map(s=>`signal:${s}`)];for(const term of positive)if(text.includes(` ${term.trim()} `)){score+=term.includes('manager')||term==='gerente'||term==='principal'||term==='lead'?8:5;reasons.push(`target:${term.trim()}`)}for(const term of negative)if(text.includes(` ${term.trim()} `)){score-=18;reasons.push(`downrank:${term}`)}return{score:Math.max(0,Math.min(100,Math.round(score))),reasons:[...new Set(reasons)]}}
export function buildCareerRavenSnapshot(messages:CareerEmail[],jobs:JobOpportunity[],now=new Date()):CareerRavenSnapshot{
 const discoveries=extractJobDiscoveries(messages,jobs);
 const applied=messages.filter(m=>m.category==='application_confirmation').map(m=>({company:m.detectedCompany,role:m.detectedRole,subject:m.subject,receivedAt:m.receivedAt})).slice(0,20);
 const recommendations=discoveries.map(d=>{const strategic=strategicScore(d);const decision:CareerRavenDecision=d.duplicateJobId?'ALREADY_APPLIED':strategic.score>=78?'APPLY_NOW':strategic.score>=60?'REVIEW':'SKIP';return{id:d.id,title:d.title,company:d.company,score:strategic.score,decision,reasons:strategic.reasons,sourceMessageId:d.sourceMessageId,duplicateJobId:d.duplicateJobId}}).sort((a,b)=>b.score-a.score).slice(0,30);
 return{generatedAt:now.toISOString(),applied,recommendations};
}
