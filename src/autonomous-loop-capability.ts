import { AutonomousExecutionLoop, type AutonomousLoopPolicy, type AutonomousPhaseExecutor, type AutonomousRunResult } from './autonomous-execution-loop.js';
import { RuntimeCapabilityRegistry, type RuntimeCapability } from './runtime-capability-seam.js';

export interface AutonomousLoopCapabilityInput {
  objective: string;
  policy?: Partial<AutonomousLoopPolicy>;
  executor: AutonomousPhaseExecutor;
}

const autonomousLoopCapability: RuntimeCapability<AutonomousLoopCapabilityInput, AutonomousRunResult> = {
  name: 'execution.autonomous-loop',
  async execute(input) {
    const loop = new AutonomousExecutionLoop(input.executor, input.policy);
    return loop.run(input.objective);
  },
};

export function registerAutonomousLoopCapability(registry: RuntimeCapabilityRegistry): void {
  if (!registry.has(autonomousLoopCapability.name)) registry.register(autonomousLoopCapability);
}
