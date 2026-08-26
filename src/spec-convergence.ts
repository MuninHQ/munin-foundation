export interface SpecRequirement { id:string; text:string; acceptanceCriteria:string[] }
export interface SpecContract { objective:string; requirements:SpecRequirement[] }
export interface RequirementEvidence { requirementId:string; evidence:string[] }
export interface ConvergenceReport { pass:boolean; score:number; orphanRequirements:string[]; missingEvidence:string[]; unscopedImplementation:string[] }
export function evaluateSpecConvergence(spec:SpecContract,evidence:RequirementEvidence[],implementationTags:string[]=[]):ConvergenceReport{
 const seen=new Map(evidence.map(item=>[item.requirementId,item]));
 const orphanRequirements=spec.requirements.filter(r=>!seen.has(r.id)).map(r=>r.id);
 const missingEvidence=spec.requirements.filter(r=>{const e=seen.get(r.id);return !e||e.evidence.filter(Boolean).length<Math.max(1,r.acceptanceCriteria.length)}).map(r=>r.id);
 const known=new Set(spec.requirements.map(r=>r.id));
 const unscopedImplementation=implementationTags.filter(tag=>!known.has(tag));
 const total=Math.max(1,spec.requirements.length);
 const satisfied=spec.requirements.filter(r=>!orphanRequirements.includes(r.id)&&!missingEvidence.includes(r.id)).length;
 const score=Math.round((satisfied/total)*100);
 return {pass:orphanRequirements.length===0&&missingEvidence.length===0&&unscopedImplementation.length===0,score,orphanRequirements,missingEvidence,unscopedImplementation};
}
