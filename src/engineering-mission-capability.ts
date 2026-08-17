import type { AutonomousLoopPolicy } from './autonomous-execution-loop.js';
import { EngineeringAutonomousMission, type EngineeringAutonomousMissionResult, type EngineeringMissionRuntime } from './engineering-autonomous-mission.js';
import { RuntimeCapabilityRegistry, type RuntimeCapability } from './runtime-capability-seam.js';
import { SkillAwareEngineeringRuntime } from './skill-aware-engineering-runtime.js';

export interface EngineeringMissionCapabilityInput {
  objective: string;
  policy?: Partial<AutonomousLoopPolicy>;
}

export function createEngineeringMissionCapability(
  runtime: EngineeringMissionRuntime = new SkillAwareEngineeringRuntime(),
): RuntimeCapability<EngineeringMissionCapabilityInput, EngineeringAutonomousMissionResult> {
  return {
    name: 'engineering.autonomous-mission',
    async execute(input) {
      const mission = new EngineeringAutonomousMission(runtime, input.policy);
      return mission.run(input.objective);
    },
  };
}

export function registerEngineeringMissionCapability(
  registry: RuntimeCapabilityRegistry,
  runtime?: EngineeringMissionRuntime,
): void {
  if (!registry.has('engineering.autonomous-mission')) registry.register(createEngineeringMissionCapability(runtime));
}
