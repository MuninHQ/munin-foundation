import { CareerInboxStore } from './career-inbox.js';
import { buildCareerProcesses } from './career-intelligence.js';
import { ContextStore } from './store.js';
import type { JobOpportunity } from './types.js';

const terminal=new Set(['offer','rejected','closed']);
export interface CareerContinuityAuditFinding{code:string;ok:boolean;detail:string;jobId?:string}
export interface CareerContinuityAuditReport{generatedAt:string;activeJobs:number;findings:CareerContinuityAuditFinding[];passed:number;failed:number;healthy:boolean}

export function auditCareerContinuity(jobs:JobOpportunity[],messages:Awaited<ReturnType<CareerInboxStore['load']>>['messages']):CareerContinuityAuditReport{
 const activeJobs=jobs.filter(job=>!terminal.has(job.status));
 const processes=buildCareerProcesses(jobs,messages).filter(process=>!terminal.has(process.job.status));
 const findings:CareerContinuityAuditFinding[]=[];
 const processIds=processes.map(process=>process.job.id);
 const unique=new Set(processIds);
 findings.push({code:'pipeline_reconstructed',ok:processes.length===activeJobs.length&&unique.size===activeJobs.length,detail:`${processes.length}/${activeJobs.length} active opportunities reconstructed.`});
 for(const process of processes){
  const hasNext=Boolean(process.suggestedAction?.trim()||process.job.nextAction?.trim());
  findings.push({code:'next_action_available',ok:hasNext,jobId:process.job.id,detail:hasNext?'Next action is available.':'Active opportunity has no explicit next action.'});
  const statusChanged=Boolean(process.suggestedStatus&&process.suggestedStatus!==process.job.status);
  const hasProvenance=!statusChanged||process.signals.length>0;
  findings.push({code:'suggestion_has_provenance',ok:hasProvenance,jobId:process.job.id,detail:hasProvenance?'Suggested state is source-anchored or unchanged.':'Suggested status lacks a linked signal.'});
  const reviewSafe=process.automation!=='auto'||Boolean(process.signals[0]&&process.signals[0].confidence>=.9);
  findings.push({code:'automatic_change_high_confidence',ok:reviewSafe,jobId:process.job.id,detail:reviewSafe?'Automatic transition is high-confidence or requires review.':'Automatic transition is below confidence boundary.'});
 }
 const failed=findings.filter(item=>!item.ok).length;
 return{generatedAt:new Date().toISOString(),activeJobs:activeJobs.length,findings,passed:findings.length-failed,failed,healthy:failed===0};
}

export async function runCareerContinuityAudit():Promise<CareerContinuityAuditReport>{
 const [state,inbox]=await Promise.all([new ContextStore().load(),new CareerInboxStore().load()]);
 return auditCareerContinuity(state.jobs,inbox.messages);
}
