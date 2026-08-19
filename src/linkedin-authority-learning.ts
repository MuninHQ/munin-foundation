import { readFile } from 'node:fs/promises';
import { runtimePath } from './config.js';
import { writeJsonAtomic } from './storage.js';
import { loadLinkedInContent, type LinkedInPost } from './linkedin-content.js';
import { andreBrandProfile, evaluateBrandCandidate } from './personal-brand-intelligence.js';

export type PerformanceObservation={
  postId:string;
  impressions?:number;
  reactions?:number;
  comments?:number;
  reposts?:number;
  relevantConversations?:number;
  inboundOpportunities?:number;
  profileViews?:number;
  followersGained?:number;
  note?:string;
  observedAt:string;
};

export type LearnedPostPerformance={
  postId:string;
  title:string;
  thesisIds:string[];
  engagementRate?:number;
  authorityScore:number;
  conversionSignals:number;
  observation:PerformanceObservation;
};

export type ThesisLearning={
  thesisId:string;
  statement:string;
  observations:number;
  averageAuthorityScore:number;
  relevantConversations:number;
  inboundOpportunities:number;
  recommendation:'insufficient-data'|'experiment'|'reinforce'|'advance';
};

interface LearningState{observations:PerformanceObservation[];updatedAt:string}
const file=()=>runtimePath('linkedin-authority-learning.json');
const empty=():LearningState=>({observations:[],updatedAt:new Date(0).toISOString()});
const bounded=(value:unknown,name:string)=>{if(value===undefined)return undefined;if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(`${name} must be a non-negative number`);return Math.round(value);};
async function loadState():Promise<LearningState>{try{const parsed=JSON.parse(await readFile(file(),'utf8')) as Partial<LearningState>;return {...empty(),...parsed,observations:Array.isArray(parsed.observations)?parsed.observations:[]};}catch{return empty();}}
async function saveState(state:LearningState){state.updatedAt=new Date().toISOString();await writeJsonAtomic(file(),state);return state;}
function performanceFor(post:LinkedInPost,observation:PerformanceObservation):LearnedPostPerformance{
  const impressions=observation.impressions??0;
  const engagements=(observation.reactions??0)+(observation.comments??0)*2+(observation.reposts??0)*3;
  const engagementRate=impressions>0?Number(((engagements/impressions)*100).toFixed(2)):undefined;
  const conversionSignals=(observation.relevantConversations??0)+(observation.inboundOpportunities??0)*3;
  const reachScore=impressions>0?Math.min(25,Math.log10(Math.max(10,impressions))*7):0;
  const engagementScore=engagementRate===undefined?0:Math.min(25,engagementRate*3.5);
  const conversationScore=Math.min(30,(observation.relevantConversations??0)*8);
  const opportunityScore=Math.min(20,(observation.inboundOpportunities??0)*12);
  const authorityScore=Math.round(Math.min(100,reachScore+engagementScore+conversationScore+opportunityScore));
  const evaluation=evaluateBrandCandidate({topic:post.title,angle:post.body},andreBrandProfile);
  return {postId:post.id,title:post.title,thesisIds:evaluation.matchedTheses.map(x=>x.id),engagementRate,authorityScore,conversionSignals,observation};
}

export async function recordLinkedInPerformance(input:Omit<PerformanceObservation,'observedAt'>&{observedAt?:string}){
  const content=await loadLinkedInContent();
  const post=content.posts.find(item=>item.id===input.postId);
  if(!post)throw new Error('LinkedIn post not found');
  if(post.status!=='published')throw new Error('Performance can only be recorded for a published LinkedIn post');
  const observation:PerformanceObservation={postId:input.postId,impressions:bounded(input.impressions,'impressions'),reactions:bounded(input.reactions,'reactions'),comments:bounded(input.comments,'comments'),reposts:bounded(input.reposts,'reposts'),relevantConversations:bounded(input.relevantConversations,'relevantConversations'),inboundOpportunities:bounded(input.inboundOpportunities,'inboundOpportunities'),profileViews:bounded(input.profileViews,'profileViews'),followersGained:bounded(input.followersGained,'followersGained'),note:input.note?.trim()||undefined,observedAt:input.observedAt??new Date().toISOString()};
  const state=await loadState();
  const index=state.observations.findIndex(item=>item.postId===observation.postId);
  if(index>=0)state.observations[index]=observation;else state.observations.unshift(observation);
  await saveState(state);
  return observation;
}

export async function linkedinAuthorityLearning(){
  const [content,state]=await Promise.all([loadLinkedInContent(),loadState()]);
  const postById=new Map(content.posts.map(post=>[post.id,post]));
  const posts=state.observations.map(observation=>{const post=postById.get(observation.postId);return post?performanceFor(post,observation):undefined;}).filter((value):value is LearnedPostPerformance=>Boolean(value)).sort((a,b)=>b.observation.observedAt.localeCompare(a.observation.observedAt));
  const observedIds=new Set(state.observations.map(item=>item.postId));
  const availablePosts=content.posts.filter(post=>post.status==='published').map(post=>({postId:post.id,title:post.title,publishedAt:post.publishedAt,observed:observedIds.has(post.id)})).sort((a,b)=>(b.publishedAt??'').localeCompare(a.publishedAt??''));
  const theses:ThesisLearning[]=andreBrandProfile.theses.filter(x=>x.status==='active').map(thesis=>{
    const relevant=posts.filter(post=>post.thesisIds.includes(thesis.id));
    const averageAuthorityScore=relevant.length?Math.round(relevant.reduce((sum,item)=>sum+item.authorityScore,0)/relevant.length):0;
    const relevantConversations=relevant.reduce((sum,item)=>sum+(item.observation.relevantConversations??0),0);
    const inboundOpportunities=relevant.reduce((sum,item)=>sum+(item.observation.inboundOpportunities??0),0);
    let recommendation:ThesisLearning['recommendation']='insufficient-data';
    if(relevant.length>=2)recommendation=averageAuthorityScore>=65||inboundOpportunities>0?'advance':averageAuthorityScore>=40||relevantConversations>0?'reinforce':'experiment';
    else if(relevant.length===1)recommendation='experiment';
    return {thesisId:thesis.id,statement:thesis.statement,observations:relevant.length,averageAuthorityScore,relevantConversations,inboundOpportunities,recommendation};
  });
  const observedPosts=posts.length;
  const authorityScore=observedPosts?Math.round(posts.reduce((sum,item)=>sum+item.authorityScore,0)/observedPosts):0;
  return {
    observedPosts,
    availablePosts,
    authorityScore,
    relevantConversations:posts.reduce((sum,item)=>sum+(item.observation.relevantConversations??0),0),
    inboundOpportunities:posts.reduce((sum,item)=>sum+(item.observation.inboundOpportunities??0),0),
    posts,
    theses,
    principle:'Optimize for relevant authority, conversations and professional opportunities; engagement is supporting evidence, not the objective.',
    updatedAt:state.updatedAt
  };
}
