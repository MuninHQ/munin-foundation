import {evaluateSpecConvergence,type RequirementEvidence,type SpecContract} from './spec-convergence.js';
export type SpecDriftProfile='strict'|'normal'|'exploratory';
export interface SpecChangePolicy{profile:SpecDriftProfile;allowedFiles?:string[];forbiddenEffects?:string[]}
export interface SpecDriftInput{spec:SpecContract;evidence:RequirementEvidence[];implementationTags:string[];changedFiles?:string[];observedEffects?:string[];policy:SpecChangePolicy}
export interface SpecDriftReport{pass:boolean;coverage:number;missingRequirements:string[];unauthorizedChanges:string[];forbiddenEffects:string[];profile:SpecDriftProfile}
function matches(file:string,pattern:string){if(pattern.endsWith('/**'))return file.startsWith(pattern.slice(0,-3));if(pattern.endsWith('*'))return file.startsWith(pattern.slice(0,-1));return file===pattern}
export function evaluateSpecDrift(input:SpecDriftInput):SpecDriftReport{
 const convergence=evaluateSpecConvergence(input.spec,input.evidence,input.implementationTags);
 const allowed=input.policy.allowedFiles??[];
 const unauthorizedChanges=allowed.length?(input.changedFiles??[]).filter(file=>!allowed.some(pattern=>matches(file,pattern))):[];
 const forbidden=new Set(input.policy.forbiddenEffects??[]);const forbiddenEffects=(input.observedEffects??[]).filter(effect=>forbidden.has(effect));
 const missingRequirements=[...new Set([...convergence.orphanRequirements,...convergence.missingEvidence])];
 const strict=input.policy.profile==='strict';const exploratory=input.policy.profile==='exploratory';
 const pass=forbiddenEffects.length===0&&missingRequirements.length===0&&(exploratory||unauthorizedChanges.length===0)&&(strict?convergence.unscopedImplementation.length===0:true);
 return{pass,coverage:convergence.score,missingRequirements,unauthorizedChanges,forbiddenEffects,profile:input.policy.profile};
}
