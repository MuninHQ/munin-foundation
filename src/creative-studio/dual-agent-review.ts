import { loadLinkedInContent } from '../linkedin-content.js';
import { publicationPackage, publisherQueue } from '../linkedin-publisher.js';
import { runClaudeCodeCreativeReview, type ClaudeCodeAdapterOptions } from './claude-code-adapter.js';
import type { CreativeBrief, CreativeAgentResult, DualAgentReviewResult } from './types.js';

const REQUIRED_CONSTRAINTS=[
  'No AJ logo, AJ monogram, initials, personal signature, watermark, or branding mark.',
  'No text, captions, labels, or UI inside the image.',
  'Premium executive editorial aesthetic; avoid generic stock-photo language.',
  '4:5 portrait composition suitable for LinkedIn.',
  'Preserve the scheduled publication state; this review must not publish, reschedule, revoke, or mutate LinkedIn state.',
];

const DEFAULT_CRITERIA=[
  'message-to-image coherence',
  'executive visual impact',
  'originality versus recent posts',
  'clarity at mobile-feed size',
  'premium editorial quality',
  'brand constraint compliance',
];

function uniq(values:string[]){return [...new Set(values.map(value=>value.trim()).filter(Boolean))];}

export async function creativeBriefFromPost(postId:string):Promise<CreativeBrief>{
  const [pkg,content]=await Promise.all([publicationPackage(postId),loadLinkedInContent()]);
  return {
    id:`creative_${postId}`,
    title:pkg.title,
    postBody:pkg.body,
    objective:'Create the strongest editorial hero image for the approved LinkedIn post without changing its publication state.',
    audience:['financial-services leaders','product and technology executives','digital-assets and AI practitioners'],
    themes:pkg.themes,
    visualConcept:pkg.visualConcept?.trim()||'A single symbolic object that makes the post thesis immediately legible without literal UI or text.',
    imagePrompt:pkg.imagePrompt?.trim()||'',
    constraints:uniq([...REQUIRED_CONSTRAINTS,...content.visualProfile.avoid.map(item=>`Avoid: ${item}.`),content.visualProfile.logoTreatment]),
    evaluationCriteria:DEFAULT_CRITERIA,
    createdAt:new Date().toISOString(),
  };
}

export async function nextScheduledCreativeBrief(reference=new Date()):Promise<CreativeBrief>{
  const queue=await publisherQueue();
  const next=queue
    .filter(item=>item.status==='scheduled'&&item.scheduledFor&&Date.parse(item.scheduledFor)>reference.getTime())
    .sort((a,b)=>Date.parse(a.scheduledFor??'')-Date.parse(b.scheduledFor??''))[0];
  if(!next)throw new Error('No future scheduled LinkedIn post is available for Creative Studio review.');
  return creativeBriefFromPost(next.postId);
}

export function buildChatGptComparisonPrompt(brief:CreativeBrief,claude:CreativeAgentResult,chatGptCandidate?:string):string{
  return [
    'You are the final creative director inside Munin Creative Studio.',
    'Compare the proposals against the brief. Keep only improvements that increase clarity, originality, and executive visual quality.',
    'Do not change the LinkedIn post body or publication schedule. Do not publish anything.',
    '',
    'BRIEF',
    JSON.stringify(brief,null,2),
    '',
    'CHATGPT CANDIDATE',
    chatGptCandidate?.trim()||'[Create an independent candidate now before judging Claude.]',
    '',
    'CLAUDE CODE REVIEW',
    claude.status==='ok'?(claude.output??''):`[${claude.status}: ${claude.error??'no output'}]`,
    '',
    'Return: WINNING_ELEMENTS, REJECTED_ELEMENTS, FINAL_VISUAL_CONCEPT, FINAL_IMAGE_PROMPT, BRAND_CHECK, FINAL_SCORE_0_100.',
    'The FINAL_IMAGE_PROMPT must explicitly exclude AJ/logo/monogram/initials/signature/watermark and text inside the image.',
  ].join('\n');
}

export async function runDualAgentCreativeReview(brief:CreativeBrief,input:{chatGptCandidate?:string;claude?:ClaudeCodeAdapterOptions}={}):Promise<DualAgentReviewResult>{
  const claude=await runClaudeCodeCreativeReview(brief,input.claude);
  return {
    briefId:brief.id,
    claude,
    comparisonPrompt:buildChatGptComparisonPrompt(brief,claude,input.chatGptCandidate),
    createdAt:new Date().toISOString(),
  };
}
