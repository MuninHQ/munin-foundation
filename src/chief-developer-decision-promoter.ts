import type { AgentScorecard } from './agent-scorecards.js';
import type { CommitteeDecision } from './consensus-committee.js';
import { ProjectMemoryStore } from './project-memory.js';

export interface ChiefDecisionPromotionInput{
 objective:string;
 status:'completed'|'partial'|'blocked'|'failed'|'needs_revision';
 committee:CommitteeDecision;
 scorecard?:AgentScorecard;
 evidence:string[];
}
export interface ChiefDecisionPromotionResult{promoted:boolean;reason:string;memoryId?:string}

export class ChiefDeveloperDecisionPromoter{
 constructor(private readonly memory:ProjectMemoryStore){}
 async promote(input:ChiefDecisionPromotionInput):Promise<ChiefDecisionPromotionResult>{
  if(input.status!=='completed')return{promoted:false,reason:'Only completed objectives are durable-decision candidates.'};
  if(input.committee.outcome!=='approve'||input.committee.score<0.5)return{promoted:false,reason:'Committee approval is not strong enough for durable promotion.'};
  if(!input.scorecard||input.scorecard.score<0.7||input.scorecard.evidenceRate<=0)return{promoted:false,reason:'Execution scorecard lacks sufficient completion/evidence quality.'};
  if(!input.evidence.length)return{promoted:false,reason:'Durable promotion requires execution evidence.'};
  const observedAt=new Date().toISOString();
  const captured=await this.memory.capture({kind:'decision',title:`Chief Developer · ${input.objective}`,content:[`Outcome: ${input.status}.`,`Committee score: ${input.committee.score}.`,`Chief Developer score: ${input.scorecard.score}.`,'Committee rationale:',...input.committee.rationale.map(item=>`- ${item}`),'Execution evidence:',...input.evidence.slice(0,20).map(item=>`- ${item}`)].join('\n'),project:'munin',source:'munin:chief-developer-runtime',observedAt,confidence:'confirmed',tags:['chief-developer','consensus','durable-decision'],relatedIssues:['#241']});
  return{promoted:true,reason:'Evidence-backed Chief Developer decision promoted to canonical project memory.',memoryId:captured.record.id};
 }
}
