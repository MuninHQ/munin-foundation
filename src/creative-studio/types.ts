export type CreativeAgentName='chatgpt'|'claude-code';

export interface CreativeBrief {
  id:string;
  title:string;
  postBody:string;
  objective:string;
  audience:string[];
  themes:string[];
  visualConcept:string;
  imagePrompt:string;
  constraints:string[];
  evaluationCriteria:string[];
  createdAt:string;
}

export interface CreativeAgentResult {
  agent:CreativeAgentName;
  status:'ok'|'unavailable'|'error';
  output?:string;
  error?:string;
  durationMs:number;
}

export interface CreativeReviewCandidate {
  agent:CreativeAgentName;
  proposal:string;
  strengths:string[];
  risks:string[];
  score:number;
}

export interface DualAgentReviewResult {
  briefId:string;
  claude:CreativeAgentResult;
  comparisonPrompt:string;
  createdAt:string;
}
