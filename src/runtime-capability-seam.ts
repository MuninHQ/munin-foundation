export type CapabilityHookPhase = 'before' | 'after' | 'error';

export interface CapabilityExecutionContext<TInput = unknown> {
  capability: string;
  executionId: string;
  input: TInput;
  startedAt: string;
  metadata: Record<string, unknown>;
}

export interface CapabilityExecutionResult<TOutput = unknown> {
  capability: string;
  executionId: string;
  output: TOutput;
  startedAt: string;
  finishedAt: string;
  trace: CapabilityTraceEvent[];
}

export interface CapabilityTraceEvent {
  phase: 'registered' | 'before' | 'execute' | 'after' | 'error' | 'disposed';
  capability: string;
  executionId?: string;
  at: string;
  detail?: string;
}

export interface RuntimeCapability<TInput = unknown, TOutput = unknown> {
  name: string;
  execute(input: TInput, context: CapabilityExecutionContext<TInput>): Promise<TOutput>;
}

export interface CapabilityHook {
  name: string;
  phase: CapabilityHookPhase;
  run(context: CapabilityExecutionContext, value?: unknown): Promise<void> | void;
}

export interface CapabilityRegistration {
  dispose(): void;
}

function timestamp(): string {
  return new Date().toISOString();
}

export class RuntimeCapabilityRegistry {
  private readonly capabilities = new Map<string, RuntimeCapability>();
  private readonly hooks: CapabilityHook[] = [];
  private sequence = 0;

  register<TInput, TOutput>(capability: RuntimeCapability<TInput, TOutput>): CapabilityRegistration {
    const name = capability.name.trim();
    if (!name) throw new Error('Capability name is required.');
    if (this.capabilities.has(name)) throw new Error(`Capability already registered: ${name}`);
    this.capabilities.set(name, capability as RuntimeCapability);
    let active = true;
    return {
      dispose: () => {
        if (!active) return;
        active = false;
        if (this.capabilities.get(name) === capability) this.capabilities.delete(name);
      },
    };
  }

  intercept(hook: CapabilityHook): CapabilityRegistration {
    if (!hook.name.trim()) throw new Error('Hook name is required.');
    this.hooks.push(hook);
    let active = true;
    return {
      dispose: () => {
        if (!active) return;
        active = false;
        const index = this.hooks.indexOf(hook);
        if (index >= 0) this.hooks.splice(index, 1);
      },
    };
  }

  list(): string[] {
    return [...this.capabilities.keys()].sort();
  }

  has(name: string): boolean {
    return this.capabilities.has(name);
  }

  async execute<TInput, TOutput>(
    capabilityName: string,
    input: TInput,
    metadata: Record<string, unknown> = {},
  ): Promise<CapabilityExecutionResult<TOutput>> {
    const capability = this.capabilities.get(capabilityName) as RuntimeCapability<TInput, TOutput> | undefined;
    if (!capability) throw new Error(`Capability not registered: ${capabilityName}`);

    const executionId = `cap-${Date.now().toString(36)}-${(++this.sequence).toString(36)}`;
    const startedAt = timestamp();
    const context: CapabilityExecutionContext<TInput> = {
      capability: capabilityName,
      executionId,
      input,
      startedAt,
      metadata: { ...metadata },
    };
    const trace: CapabilityTraceEvent[] = [];

    const emit = (phase: CapabilityTraceEvent['phase'], detail?: string): void => {
      trace.push({ phase, capability: capabilityName, executionId, at: timestamp(), detail });
    };

    try {
      for (const hook of this.hooks.filter(item => item.phase === 'before')) {
        emit('before', hook.name);
        await hook.run(context);
      }

      emit('execute', capability.name);
      const output = await capability.execute(input, context);

      for (const hook of this.hooks.filter(item => item.phase === 'after')) {
        emit('after', hook.name);
        await hook.run(context, output);
      }

      return {
        capability: capabilityName,
        executionId,
        output,
        startedAt,
        finishedAt: timestamp(),
        trace,
      };
    } catch (error) {
      emit('error', error instanceof Error ? error.message : String(error));
      for (const hook of this.hooks.filter(item => item.phase === 'error')) {
        try {
          await hook.run(context, error);
        } catch (hookError) {
          emit('error', `error hook ${hook.name} failed: ${hookError instanceof Error ? hookError.message : String(hookError)}`);
        }
      }
      throw error;
    }
  }
}
