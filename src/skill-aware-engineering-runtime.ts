import { loadEngineeringSkillContext } from './engineering-skill-context.js';
import { EngineeringAgentRuntime, type EngineeringEvent, type EngineeringResult } from './engineering-runtime.js';
import type { EngineeringMissionRuntime } from './engineering-autonomous-mission.js';

export class SkillAwareEngineeringRuntime implements EngineeringMissionRuntime {
  constructor(
    private readonly repositoryRoot = process.cwd(),
    private readonly runtime: EngineeringMissionRuntime = new EngineeringAgentRuntime(repositoryRoot),
  ) {}

  async execute(objective: string): Promise<EngineeringResult> {
    const context = await loadEngineeringSkillContext(this.repositoryRoot, objective);
    if (!context.text) return this.runtime.execute(objective);

    const enrichedObjective = `${objective}\n\nEngineering methodology context (apply when relevant; repository objective remains authoritative):\n${context.text}`;
    const result = await this.runtime.execute(enrichedObjective);
    const methodologyEvent: EngineeringEvent = {
      phase: 'plan',
      message: 'Engineering methodology skills loaded.',
      at: new Date().toISOString(),
      evidence: context.names.join(', '),
    };
    return {
      ...result,
      objective,
      events: [methodologyEvent, ...result.events],
      message: result.message,
    };
  }
}
