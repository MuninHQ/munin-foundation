import { careerContinuityMetrics, type CareerContinuityMetrics } from './career-continuity-validation.js';

export type CareerContinuityStatus='insufficient_evidence'|'supported'|'at_risk';
export interface CareerContinuityReport{status:CareerContinuityStatus;metrics:CareerContinuityMetrics;summary:string;killCriterionTriggered:boolean;next:string}

export function buildCareerContinuityReport(metrics:CareerContinuityMetrics):CareerContinuityReport{
 const insufficient=metrics.total<5;
 const killCriterionTriggered=metrics.total>=5&&metrics.accuracy<.8;
 const status:CareerContinuityStatus=insufficient?'insufficient_evidence':metrics.meetsTarget?'supported':'at_risk';
 const percent=Math.round(metrics.accuracy*100);
 const summary=insufficient
  ? `Evidence incomplete: ${metrics.total}/5 minimum continuity checks recorded (${percent}% correct so far).`
  : metrics.meetsTarget
   ? `Career continuity is currently supported: ${percent}% correct across ${metrics.total} checks, meeting the 80% target.`
   : `Career continuity is at risk: ${percent}% correct across ${metrics.total} checks, below the 80% target.`;
 const next=insufficient
  ? `Record ${5-metrics.total} more real follow-up interaction${5-metrics.total===1?'':'s'} before making a product decision.`
  : metrics.meetsTarget
   ? 'Continue the validation window and watch for stale-state corrections, unsafe automatic mutations, and usefulness versus a manual job list.'
   : 'Stop career-specific expansion and investigate continuity errors before adding more features.';
 return {status,metrics,summary,killCriterionTriggered,next};
}

export async function careerContinuityReport(){return buildCareerContinuityReport(await careerContinuityMetrics())}
