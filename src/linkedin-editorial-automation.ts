import { composeLinkedInPost, composerSuggestions, type BrandScoredSuggestion } from './linkedin-composer.js';
import { loadLinkedInContent, type LinkedInPost } from './linkedin-content.js';

export interface EditorialAutomationPolicy {
  minAdaptiveScore:number; minNovelty:number; minBrandScore:number;
  maxDraftsPerWeek:number; maxPendingDrafts:number; requireTrustedSignal:boolean;
}
export interface EditorialAutomationInput {
  suggestions:BrandScoredSuggestion[]; signals:{themes:string[];relevance:number}[];
  posts:LinkedInPost[]; now?:Date; policy?:Partial<EditorialAutomationPolicy>;
}
export type EditorialAutomationDecision =
  | {action:'compose';suggestion:BrandScoredSuggestion;reasons:string[]}
  | {action:'skip';reasons:string[]};

export const DEFAULT_EDITORIAL_AUTOMATION_POLICY:EditorialAutomationPolicy={
  minAdaptiveScore:70,minNovelty:55,minBrandScore:70,maxDraftsPerWeek:2,maxPendingDrafts:2,requireTrustedSignal:true,
};

function normalized(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function withinDays(value:string,now:Date,days:number){const ms=Date.parse(value);return Number.isFinite(ms)&&now.getTime()-ms<days*86_400_000;}
function hasMatchingSignal(suggestion:BrandScoredSuggestion,signals:EditorialAutomationInput['signals']){const themes=new Set(suggestion.themes.map(normalized));return signals.some(signal=>signal.relevance>=36&&signal.themes.some(theme=>themes.has(normalized(theme))));}

export function decideEditorialAutomation(input:EditorialAutomationInput):EditorialAutomationDecision {
  const policy={...DEFAULT_EDITORIAL_AUTOMATION_POLICY,...Object.fromEntries(Object.entries(input.policy??{}).filter(([,value])=>value!==undefined))};
  const now=input.now??new Date();
  const pending=input.posts.filter(post=>post.status==='draft').length;
  if(pending>=policy.maxPendingDrafts)return {action:'skip',reasons:[`pending-draft-limit:${pending}/${policy.maxPendingDrafts}`]};
  const weekly=input.posts.filter(post=>post.status==='draft'&&withinDays(post.createdAt,now,7)).length;
  if(weekly>=policy.maxDraftsPerWeek)return {action:'skip',reasons:[`weekly-draft-limit:${weekly}/${policy.maxDraftsPerWeek}`]};
  const recentTitles=new Set(input.posts.filter(post=>withinDays(post.updatedAt,now,60)).map(post=>normalized(post.title)));
  const ranked=input.suggestions.filter(suggestion=>suggestion.brandEvaluation.publish&&suggestion.brandEvaluation.score>=policy.minBrandScore&&suggestion.adaptiveScore>=policy.minAdaptiveScore&&suggestion.novelty>=policy.minNovelty&&!recentTitles.has(normalized(suggestion.title))&&(!policy.requireTrustedSignal||hasMatchingSignal(suggestion,input.signals))).sort((a,b)=>b.adaptiveScore-a.adaptiveScore||b.editorialScore-a.editorialScore||b.novelty-a.novelty);
  const suggestion=ranked[0];
  if(!suggestion)return {action:'skip',reasons:['no-eligible-current-signal','brand-novelty-or-repetition-gate']};
  return {action:'compose',suggestion,reasons:[`adaptive:${suggestion.adaptiveScore}`,`brand:${suggestion.brandEvaluation.score}`,`novelty:${suggestion.novelty}`]};
}

export async function runEditorialAutomation(options:{generateImage?:boolean;refreshSources?:boolean;policy?:Partial<EditorialAutomationPolicy>}={}){
  const [source,content]=await Promise.all([composerSuggestions(options.refreshSources!==false),loadLinkedInContent()]);
  const decision=decideEditorialAutomation({suggestions:source.suggestions,signals:source.signals,posts:content.posts,policy:options.policy});
  if(decision.action==='skip')return {status:'skipped' as const,sourceMode:source.sourceMode,reasons:decision.reasons};
  const result=await composeLinkedInPost({suggestionId:decision.suggestion.id,generateImage:options.generateImage===true,refreshSources:false});
  return {status:'draft-created' as const,sourceMode:source.sourceMode,reasons:decision.reasons,postId:result.draft.id,title:result.draft.title,brandGuard:result.brandGuard,textMode:result.textMode,image:result.image,imageSkippedReason:result.imageSkippedReason};
}
