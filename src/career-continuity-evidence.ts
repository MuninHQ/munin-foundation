import { careerContinuityReport, type CareerContinuityReport } from './career-continuity-report.js';
import { runCareerContinuityAudit, type CareerContinuityAuditReport } from './career-continuity-audit.js';

export type CareerHypothesisEvidenceStatus='insufficient_evidence'|'supported'|'at_risk'|'structural_failure';
export interface CareerHypothesisEvidenceReport{
 generatedAt:string;
 status:CareerHypothesisEvidenceStatus;
 readyToConclude:boolean;
 empirical:CareerContinuityReport;
 structural:CareerContinuityAuditReport;
 blockers:string[];
 summary:string;
}

export function combineCareerContinuityEvidence(empirical:CareerContinuityReport,structural:CareerContinuityAuditReport):CareerHypothesisEvidenceReport{
 const blockers:string[]=[];
 if(!structural.healthy)blockers.push(`${structural.failed} structural continuity check${structural.failed===1?'':'s'} failed.`);
 if(empirical.metrics.total<5)blockers.push(`${5-empirical.metrics.total} more real continuity feedback check${5-empirical.metrics.total===1?'':'s'} required.`);
 if(empirical.metrics.total>=5&&!empirical.metrics.meetsTarget)blockers.push(`Empirical accuracy is ${Math.round(empirical.metrics.accuracy*100)}%, below the 80% target.`);
 const status:CareerHypothesisEvidenceStatus=!structural.healthy?'structural_failure':empirical.status;
 const readyToConclude=structural.healthy&&empirical.status==='supported';
 const summary=readyToConclude
  ? `Career continuity hypothesis has sufficient current evidence: structural audit is healthy and empirical accuracy is ${Math.round(empirical.metrics.accuracy*100)}% across ${empirical.metrics.total} real checks.`
  : `Career continuity hypothesis is not ready to conclude: ${blockers.join(' ')||empirical.summary}`;
 return{generatedAt:new Date().toISOString(),status,readyToConclude,empirical,structural,blockers,summary};
}

export async function careerContinuityEvidenceReport():Promise<CareerHypothesisEvidenceReport>{
 const [empirical,structural]=await Promise.all([careerContinuityReport(),runCareerContinuityAudit()]);
 return combineCareerContinuityEvidence(empirical,structural);
}
