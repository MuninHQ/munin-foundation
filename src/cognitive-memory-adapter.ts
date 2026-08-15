export type CognitiveMemoryCandidate='native'|'yantrikdb'|'mind-mem'|'graphiti'|'engram';
export type CognitiveRecall={id:string;text:string;score:number;source:string;validFrom?:string;validTo?:string;metadata?:Record<string,unknown>};
export type CognitiveHealth={candidate:CognitiveMemoryCandidate;available:boolean;authoritative:false;detail?:string};

/**
 * Optional enrichment boundary. Munin-native continuity/project memory remains authoritative.
 * Implementations may return derived recall/graph signals but MUST NOT silently mutate native facts.
 */
export interface CognitiveMemoryAdapter {
  readonly candidate:Exclude<CognitiveMemoryCandidate,'native'>;
  health():Promise<CognitiveHealth>;
  recall(query:string,limit?:number):Promise<CognitiveRecall[]>;
}

export class NativeOnlyCognitiveMemory implements CognitiveMemoryAdapter {
  readonly candidate='yantrikdb' as const;
  async health():Promise<CognitiveHealth>{return {candidate:this.candidate,available:false,authoritative:false,detail:'No external cognitive adapter configured; Munin-native memory is active.'}}
  async recall():Promise<CognitiveRecall[]>{return []}
}

export function cognitiveMemoryPolicy(){return {
  authoritative:'munin-native' as const,
  fallback:'munin-native' as const,
  externalWriteThrough:false,
  promotionRequiresBenchmark:true,
  preferredExperiment:'yantrikdb' as const,
};}
