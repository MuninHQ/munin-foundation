import type { CapabilityCandidate } from './capability-radar.js';

export type CapabilityBenchmarkStatus='promote'|'hold';
export interface CapabilityBenchmarkResult{
 id:string;
 status:CapabilityBenchmarkStatus;
 score:number;
 checks:{zeroCost:boolean;licensed:boolean;maintained:boolean;secure:boolean;nonDuplicate:boolean;evidence:boolean;rollback:boolean};
 reasons:string[];
}

export function benchmarkCapabilityCandidate(candidate:CapabilityCandidate):CapabilityBenchmarkResult{
 const checks={
  zeroCost:(candidate.recurringCost??0)===0&&!candidate.metered&&!candidate.paidApiRequired,
  licensed:Boolean(candidate.license),
  maintained:(candidate.maintenanceScore??0)>=0.6,
  secure:(candidate.securityScore??0)>=0.7,
  nonDuplicate:(candidate.duplicationScore??0)<=0.7,
  evidence:(candidate.evidence?.length??0)>=4,
  rollback:true,
 };
 const weights={zeroCost:3,licensed:2,maintained:1,secure:3,nonDuplicate:2,evidence:1,rollback:1} as const;
 let earned=0,total=0;for(const key of Object.keys(weights) as Array<keyof typeof weights>){total+=weights[key];if(checks[key])earned+=weights[key]}
 const score=Number((earned/total).toFixed(3));
 const reasons:string[]=[];
 if(!checks.zeroCost)reasons.push('Additional paid or metered dependency detected.');
 if(!checks.licensed)reasons.push('License evidence missing.');
 if(!checks.maintained)reasons.push('Maintenance evidence below promotion threshold.');
 if(!checks.secure)reasons.push('Security evidence below promotion threshold.');
 if(!checks.nonDuplicate)reasons.push('Existing Munin capability likely overlaps this candidate.');
 if(!checks.evidence)reasons.push('Insufficient bounded evidence for promotion.');
 const status:CapabilityBenchmarkStatus=Object.values(checks).every(Boolean)&&score>=0.8?'promote':'hold';
 return{id:candidate.id,status,score,checks,reasons:reasons.length?reasons:['Candidate clears non-executing promotion benchmark.']};
}
