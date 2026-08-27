import type { AgentEvalResult,AgentEvalTrial } from './agent-eval-suite.js';
import type { AgentOutcomeSample } from './agent-scorecards.js';
import type { AgentTelemetry } from './agent-telemetry.js';

export function evalToOutcomeSample(trial:AgentEvalTrial,result:AgentEvalResult):AgentOutcomeSample{return{agentId:result.agentId,completed:trial.completed&&result.passed,evidenceCount:trial.steps.reduce((sum,step)=>sum+(step.evidence?.length??0),0),retries:trial.steps.filter(step=>step.status==='FAIL').length,defectEscaped:!result.passed&&trial.completed,humanEscalation:trial.steps.some(step=>step.status==='BLOCKED')}}

export function emitAgentEvalTelemetry(telemetry:AgentTelemetry,runId:string,trial:AgentEvalTrial,result:AgentEvalResult):void{telemetry.emit({name:result.passed?'agent.completed':'verification.failed',runId,agentId:result.agentId,outcome:result.passed?'eval_pass':'eval_fail',evidence:trial.steps.flatMap(step=>step.evidence??[]),metadata:{trialId:result.trialId,capability:result.capability,score:result.score,graders:result.graders.map(grader=>({dimension:grader.dimension,score:grader.score,passed:grader.passed}))}})}
