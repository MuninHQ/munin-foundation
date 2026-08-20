export interface AgentOutcomeSample {
  agentId: string;
  completed: boolean;
  evidenceCount: number;
  retries: number;
  defectEscaped?: boolean;
  humanEscalation?: boolean;
}

export interface AgentScorecard {
  agentId: string;
  samples: number;
  completionRate: number;
  evidenceRate: number;
  retryRate: number;
  defectEscapeRate: number;
  humanEscalationRate: number;
  score: number;
}

export function buildAgentScorecard(agentId: string, samples: AgentOutcomeSample[]): AgentScorecard {
  const relevant = samples.filter(s => s.agentId === agentId);
  const n = relevant.length || 1;
  const completionRate = relevant.filter(s => s.completed).length / n;
  const evidenceRate = relevant.reduce((sum, s) => sum + Math.min(1, s.evidenceCount > 0 ? 1 : 0), 0) / n;
  const retryRate = relevant.reduce((sum, s) => sum + Math.min(1, s.retries / 2), 0) / n;
  const defectEscapeRate = relevant.filter(s => s.defectEscaped).length / n;
  const humanEscalationRate = relevant.filter(s => s.humanEscalation).length / n;
  const score = relevant.length === 0 ? 0 : Number(Math.max(0, Math.min(1,
    completionRate * 0.35 + evidenceRate * 0.3 + (1 - retryRate) * 0.15 + (1 - defectEscapeRate) * 0.15 + (1 - humanEscalationRate) * 0.05
  )).toFixed(3));
  return { agentId, samples: relevant.length, completionRate, evidenceRate, retryRate, defectEscapeRate, humanEscalationRate, score };
}

export function rankAgents(scorecards: AgentScorecard[]): AgentScorecard[] {
  return [...scorecards].sort((a, b) => b.score - a.score || b.samples - a.samples || a.agentId.localeCompare(b.agentId));
}
