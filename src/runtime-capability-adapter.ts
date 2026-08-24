import { registerAutonomousLoopCapability, type AutonomousLoopCapabilityInput } from './autonomous-loop-capability.js';
import type { AutonomousRunResult } from './autonomous-execution-loop.js';
import { installBrowserPolicyGate, registerBrowserCapability, type BrowserCapabilityInput, type BrowserCapabilityOutput } from './browser-capability.js';
import type { EngineeringAutonomousMissionResult, EngineeringMissionRuntime } from './engineering-autonomous-mission.js';
import { registerEngineeringMissionCapability, type EngineeringMissionCapabilityInput } from './engineering-mission-capability.js';
import { registerExternalIntelligenceCapability, type ExternalIntelligenceInput, type ExternalIntelligenceOutput } from './external-intelligence-capability.js';
import { registerIndependentReviewCapability, type IndependentReviewInput, type IndependentReviewOutput } from './independent-review-capability.js';
import { registerLocalVideoCapability, type LocalVideoInput, type LocalVideoOutput } from './local-video-capability.js';
import { registerContentVideoCapability, type ContentVideoInput, type ContentVideoOutput } from './content-video-capability.js';
import { MuninMcpBridge } from './munin-mcp-bridge.js';
import { ExecutionEngine } from './runtime.js';
import { RuntimeCapabilityRegistry, type CapabilityExecutionResult } from './runtime-capability-seam.js';
import { registerSemanticIntelligenceCapability, type SemanticIntelligenceCapabilityInput, type SemanticIntelligenceCapabilityOutput } from './semantic-intelligence-capability.js';
import { registerSentryObservabilityCapability, type SentryObservabilityCapabilityInput, type SentryObservabilityCapabilityOutput } from './sentry-observability-capability.js';

export interface RuntimeCapabilityAdapterOptions {
  enabled?: boolean;
  registry?: RuntimeCapabilityRegistry;
  engineeringRuntime?: EngineeringMissionRuntime;
}

export class RuntimeCapabilityAdapter {
  readonly registry: RuntimeCapabilityRegistry;
  readonly enabled: boolean;
  readonly mcp: MuninMcpBridge;

  constructor(
    readonly engine: ExecutionEngine,
    options: RuntimeCapabilityAdapterOptions = {},
  ) {
    this.enabled = options.enabled ?? process.env.MUNIN_RUNTIME_CAPABILITIES === '1';
    this.registry = options.registry ?? new RuntimeCapabilityRegistry();
    if (this.enabled) {
      if (!this.registry.has('browser.operator')) {
        registerBrowserCapability(this.registry);
        installBrowserPolicyGate(this.registry);
      }
      if (!this.registry.has('execution.autonomous-loop')) registerAutonomousLoopCapability(this.registry);
      if (!this.registry.has('engineering.autonomous-mission')) registerEngineeringMissionCapability(this.registry, options.engineeringRuntime);
      if (!this.registry.has('code.semantic-intelligence')) registerSemanticIntelligenceCapability(this.registry);
      if (!this.registry.has('observability.sentry')) registerSentryObservabilityCapability(this.registry);
      if (!this.registry.has('intelligence.external')) registerExternalIntelligenceCapability(this.registry);
      if (!this.registry.has('engineering.independent-review')) registerIndependentReviewCapability(this.registry);
      if (!this.registry.has('media.local-video')) registerLocalVideoCapability(this.registry);
      if (!this.registry.has('media.content-video')) registerContentVideoCapability(this.registry);
    }
    this.mcp = new MuninMcpBridge(this.registry);
  }

  capabilityNames(): string[] {
    return this.enabled ? this.registry.list() : [];
  }

  async browser(input: BrowserCapabilityInput): Promise<CapabilityExecutionResult<BrowserCapabilityOutput>> {
    this.assertEnabled();
    return this.registry.execute<BrowserCapabilityInput, BrowserCapabilityOutput>('browser.operator', input, {
      source: 'execution-engine-adapter', experimental: true,
    });
  }

  async autonomousLoop(input: AutonomousLoopCapabilityInput): Promise<CapabilityExecutionResult<AutonomousRunResult>> {
    this.assertEnabled();
    return this.registry.execute<AutonomousLoopCapabilityInput, AutonomousRunResult>('execution.autonomous-loop', input, {
      source: 'execution-engine-adapter', experimental: true,
    });
  }

  async engineeringMission(input: EngineeringMissionCapabilityInput): Promise<CapabilityExecutionResult<EngineeringAutonomousMissionResult>> {
    this.assertEnabled();
    return this.registry.execute<EngineeringMissionCapabilityInput, EngineeringAutonomousMissionResult>('engineering.autonomous-mission', input, {
      source: 'execution-engine-adapter', experimental: true,
    });
  }

  async semanticIntelligence(input: SemanticIntelligenceCapabilityInput): Promise<CapabilityExecutionResult<SemanticIntelligenceCapabilityOutput>> {
    this.assertEnabled();
    return this.registry.execute<SemanticIntelligenceCapabilityInput, SemanticIntelligenceCapabilityOutput>('code.semantic-intelligence', input, {
      source: 'execution-engine-adapter', experimental: true,
    });
  }

  async sentryObservability(input:SentryObservabilityCapabilityInput):Promise<CapabilityExecutionResult<SentryObservabilityCapabilityOutput>>{
    this.assertEnabled();
    return this.registry.execute<SentryObservabilityCapabilityInput,SentryObservabilityCapabilityOutput>('observability.sentry',input,{
      source:'execution-engine-adapter', experimental:true,
    });
  }

  async externalIntelligence(input: ExternalIntelligenceInput): Promise<CapabilityExecutionResult<ExternalIntelligenceOutput>> {
    this.assertEnabled();
    return this.registry.execute<ExternalIntelligenceInput, ExternalIntelligenceOutput>('intelligence.external', input, {
      source: 'execution-engine-adapter', external: true,
    });
  }

  async independentReview(input: IndependentReviewInput): Promise<CapabilityExecutionResult<IndependentReviewOutput>> {
    this.assertEnabled();
    return this.registry.execute<IndependentReviewInput, IndependentReviewOutput>('engineering.independent-review', input, {
      source: 'execution-engine-adapter', independent: true,
    });
  }

  async localVideo(input: LocalVideoInput): Promise<CapabilityExecutionResult<LocalVideoOutput>> {
    this.assertEnabled();
    return this.registry.execute<LocalVideoInput, LocalVideoOutput>('media.local-video', input, {
      source: 'execution-engine-adapter', local: true, optIn: true,
    });
  }

  async contentVideo(input: ContentVideoInput): Promise<CapabilityExecutionResult<ContentVideoOutput>> {
    this.assertEnabled();
    return this.registry.execute<ContentVideoInput, ContentVideoOutput>('media.content-video', input, {
      source: 'execution-engine-adapter', local: true, optIn: true, humanApproval: true,
    });
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new Error('Runtime capability seam is disabled. Set MUNIN_RUNTIME_CAPABILITIES=1 to opt in.');
  }
}

export function createRuntimeCapabilityAdapter(
  engine = new ExecutionEngine(),
  options: RuntimeCapabilityAdapterOptions = {},
): RuntimeCapabilityAdapter {
  return new RuntimeCapabilityAdapter(engine, options);
}
