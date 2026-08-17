export type ProblemInterviewEvidence={participantId:string;recentContextReconstruction:boolean;crossToolPain:boolean;manualWorkaround:boolean;trustConcern:boolean;wouldTryContinuityLayer:boolean;notes?:string};
export type ProblemInterviewVerdict='insufficient_evidence'|'supported'|'ambiguous'|'reject';
export type ProblemInterviewSynthesis={participants:number;behavioralPain:number;crossToolPain:number;manualWorkarounds:number;trustConcerns:number;adoptionInterest:number;verdict:ProblemInterviewVerdict;reasons:string[]};

export function synthesizeProblemInterviews(items:ProblemInterviewEvidence[]):ProblemInterviewSynthesis{
 const participants=items.length;
 const behavioralPain=items.filter(x=>x.recentContextReconstruction).length;
 const crossToolPain=items.filter(x=>x.crossToolPain).length;
 const manualWorkarounds=items.filter(x=>x.manualWorkaround).length;
 const trustConcerns=items.filter(x=>x.trustConcern).length;
 const adoptionInterest=items.filter(x=>x.wouldTryContinuityLayer).length;
 const reasons:string[]=[];
 if(participants<5){reasons.push('five completed real interviews are required');return{participants,behavioralPain,crossToolPain,manualWorkarounds,trustConcerns,adoptionInterest,verdict:'insufficient_evidence',reasons};}
 if(behavioralPain>=4&&manualWorkarounds>=3){reasons.push('repeated observed continuity pain across participants');if(adoptionInterest>=3){reasons.push('majority adoption interest after neutral concept reveal');return{participants,behavioralPain,crossToolPain,manualWorkarounds,trustConcerns,adoptionInterest,verdict:'supported',reasons};}reasons.push('pain exists but adoption signal is weak');return{participants,behavioralPain,crossToolPain,manualWorkarounds,trustConcerns,adoptionInterest,verdict:'ambiguous',reasons};}
 if(behavioralPain<=1){reasons.push('observed continuity pain is not repeated');return{participants,behavioralPain,crossToolPain,manualWorkarounds,trustConcerns,adoptionInterest,verdict:'reject',reasons};}
 reasons.push('some pain exists but repetition is below support threshold');return{participants,behavioralPain,crossToolPain,manualWorkarounds,trustConcerns,adoptionInterest,verdict:'ambiguous',reasons};
}
