import type { ContentSuggestion, LinkedInPost } from './linkedin-content.js';
import { andreBrandProfile, authorityFlywheel, evaluateBrandCandidate, type BrandEvaluation } from './personal-brand-intelligence.js';

export type RepetitionRisk='low'|'medium'|'high';
export type LinkedInBrandEvaluation=BrandEvaluation&{
  thesisIds:string[];
  repetitionRisk:RepetitionRisk;
  repetitionScore:number;
  authorityScore:number;
  finalScore:number;
  autonomousPublishAllowed:boolean;
};

export type BrandRankedSuggestion=ContentSuggestion&{brand:LinkedInBrandEvaluation};

const words=(value:string)=>new Set(value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>3));
function similarity(a:string,b:string){const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let overlap=0;for(const token of A)if(B.has(token))overlap++;return overlap/Math.max(1,Math.min(A.size,B.size));}

export function repetitionAgainstHistory(candidate:{title:string;angle:string},posts:LinkedInPost[]){
  const published=posts.filter(post=>post.status==='published').slice(0,12);
  const score=published.reduce((max,post)=>Math.max(max,similarity(`${candidate.title} ${candidate.angle}`,`${post.title} ${post.body}`)),0);
  const repetitionRisk:RepetitionRisk=score>=0.55?'high':score>=0.32?'medium':'low';
  return {repetitionScore:Math.round(score*100),repetitionRisk};
}

export function evaluateLinkedInBrandSuggestion(suggestion:ContentSuggestion,posts:LinkedInPost[],hasTrustedEvidence=false):LinkedInBrandEvaluation{
  const base=evaluateBrandCandidate({topic:`${suggestion.title} ${suggestion.themes.join(' ')}`,angle:suggestion.angle,source:hasTrustedEvidence||suggestion.sourceSignals.some(x=>!/editorial gap/i.test(x))?'evidence':'',});
  const repetition=repetitionAgainstHistory(suggestion,posts);
  const repetitionPenalty=repetition.repetitionRisk==='high'?30:repetition.repetitionRisk==='medium'?12:0;
  const authorityScore=Math.max(0,Math.min(100,Math.round(base.score*.65+suggestion.novelty*.2+suggestion.visualNovelty*.15)));
  const finalScore=Math.max(0,Math.min(100,authorityScore-repetitionPenalty));
  const reasons=[...base.reasons];
  if(repetition.repetitionRisk==='high')reasons.push('high semantic repetition risk against recent published posts');
  else if(repetition.repetitionRisk==='medium')reasons.push('moderate semantic repetition risk; require a materially new angle');
  else reasons.push('low recent repetition risk');
  const thesisIds=base.matchedTheses.map(item=>item.id);
  return {...base,...repetition,thesisIds,authorityScore,finalScore,publish:base.publish&&finalScore>=70&&repetition.repetitionRisk!=='high',autonomousPublishAllowed:base.publish&&finalScore>=78&&repetition.repetitionRisk==='low'};
}

export function rankLinkedInBrandSuggestions(suggestions:ContentSuggestion[],posts:LinkedInPost[],evidenceBySuggestion:Record<string,boolean>={}):BrandRankedSuggestion[]{
  return suggestions.map(suggestion=>({...suggestion,brand:evaluateLinkedInBrandSuggestion(suggestion,posts,evidenceBySuggestion[suggestion.id]===true)})).sort((a,b)=>b.brand.finalScore-a.brand.finalScore||b.novelty-a.novelty);
}

export function brandPromptContext(evaluation?:LinkedInBrandEvaluation){
  const matched=andreBrandProfile.theses.filter(thesis=>evaluation?.thesisIds.includes(thesis.id));
  return {
    tribe:andreBrandProfile.tribe,
    manifesto:andreBrandProfile.manifesto,
    positioning:andreBrandProfile.positioning,
    permissionGoal:andreBrandProfile.permissionGoal,
    authorityGoal:andreBrandProfile.authorityGoal,
    matchedTheses:matched.map(thesis=>({id:thesis.id,statement:thesis.statement})),
    editorialGuardrails:[
      'Lead with an owned point of view, not a news summary.',
      'Connect emerging technology to production, infrastructure, governance, interoperability, trust or product decisions.',
      'Avoid generic hype and generic trend-list content.',
      'If the territory resembles a recent post, introduce a materially different implication, evidence point or decision frame.'
    ]
  };
}

export function personalBrandSnapshot(){return {...andreBrandProfile,authorityFlywheel:authorityFlywheel()};}
