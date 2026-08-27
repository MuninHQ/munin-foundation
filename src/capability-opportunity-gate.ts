import type { CapabilityCandidate } from './capability-radar.js';
import { assessCapability, type CapabilityAssessment } from './capability-radar.js';
import { collectDuplicationEvidence } from './capability-duplication.js';
import { assessOpportunity, type OpportunityAssessment } from './opportunity-assessment.js';

export interface GatedCapabilityAssessment { candidate:CapabilityCandidate; capability:CapabilityAssessment; opportunity:OpportunityAssessment }

export async function gateCapabilityCandidate(candidate:CapabilityCandidate,root=process.cwd()):Promise<GatedCapabilityAssessment>{
 const duplication=await collectDuplicationEvidence(candidate,root);
 const enriched={...candidate,duplicationScore:duplication.score,evidence:[...(candidate.evidence??[]),...duplication.matches.map(match=>`Overlap: ${match}`)]};
 const capability=assessCapability(enriched);
 const opportunity=assessOpportunity({id:enriched.id,problem:`Evaluate ${enriched.name} as a Munin capability`,evidence:enriched.evidence??[],existingCapabilityOverlap:duplication.score,expectedValue:capability.score,integrationCost:Math.max(0,1-(enriched.maintenanceScore??0.5)),securityImpact:Math.max(0,1-(enriched.securityScore??0.5))});
 return{candidate:enriched,capability,opportunity};
}

export function shouldPromoteCapability(result:GatedCapabilityAssessment):boolean{return result.capability.decision==='adopt'&&result.opportunity.decision==='GO'}
