import { EngineeringAutonomousMission, type EngineeringMissionRuntime } from './engineering-autonomous-mission.js';
import type { EngineeringResult } from './engineering-runtime.js';
import { SkillAwareEngineeringRuntime } from './skill-aware-engineering-runtime.js';

function loopOnlyResult(objective:string,status:'needs_user'|'failed',message:string):EngineeringResult{
 return {status,objective,changedFiles:[],events:[{phase:status==='needs_user'?'needs_user':'failed',message,at:new Date().toISOString()}],message};
}

export async function runEngineeringMission(
 objective:string,
 repositoryRoot=process.cwd(),
 runtime:EngineeringMissionRuntime=new SkillAwareEngineeringRuntime(repositoryRoot),
):Promise<EngineeringResult>{
 const mission=new EngineeringAutonomousMission(runtime,{maxIterations:3,maxRepeatedFailureFingerprints:2});
 const output=await mission.run(objective);
 if(output.engineering){
  output.engineering.events.push({
   phase:output.loop.status==='DONE'?'completed':output.loop.status==='BLOCKED'?'needs_user':'failed',
   message:`Autonomous mission loop finished with ${output.loop.status}.`,
   at:new Date().toISOString(),
   evidence:`iterations=${output.loop.iterations}; trace=${output.loop.trace.map(item=>`${item.iteration}:${item.phase}:${item.status}`).join(' > ')}`,
  });
  if(output.loop.status==='BLOCKED'&&output.engineering.status!=='needs_user'){
   return {...output.engineering,status:'needs_user',message:output.loop.blocker??output.engineering.message};
  }
  if((output.loop.status==='FAILED'||output.loop.status==='LIMIT_REACHED')&&output.engineering.status==='completed'){
   return {...output.engineering,status:'failed',message:output.loop.blocker??'Autonomous mission did not satisfy its completion gate.'};
  }
  return output.engineering;
 }
 if(output.loop.status==='BLOCKED')return loopOnlyResult(objective,'needs_user',output.loop.blocker??'Autonomous engineering mission requires user action.');
 return loopOnlyResult(objective,'failed',output.loop.blocker??'Autonomous engineering mission ended without an engineering result.');
}
