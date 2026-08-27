import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { runtimePath } from './config.js';
import { redactSecrets } from './secret-redaction.js';

export type AgentTelemetryEventName =
  | 'run.started'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'provider.selected'
  | 'tool.called'
  | 'tool.completed'
  | 'verification.failed'
  | 'retry.scheduled'
  | 'human.blocked'
  | 'run.completed';

export interface AgentTelemetryEvent {
  name: AgentTelemetryEventName;
  at: string;
  runId: string;
  taskId?: string;
  agentId?: string;
  providerId?: string;
  durationMs?: number;
  cost?: number;
  outcome?: string;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentTelemetrySink {
  write(event: AgentTelemetryEvent): Promise<void>;
}

export class JsonlAgentTelemetrySink implements AgentTelemetrySink {
  readonly path: string;
  private tail: Promise<void> = Promise.resolve();

  constructor(path = runtimePath('telemetry', 'agent-events.jsonl')) {
    this.path = resolve(path);
  }

  write(event: AgentTelemetryEvent): Promise<void> {
    const operation = this.tail.then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf8');
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
}

export class AgentTelemetry {
  constructor(
    private readonly sink: AgentTelemetrySink,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  emit(event: Omit<AgentTelemetryEvent, 'at'> & { at?: string }): void {
    const normalized = redactSecrets<AgentTelemetryEvent>({ ...event, at: event.at ?? new Date().toISOString() });
    void this.sink.write(normalized).catch(this.onError);
  }
}

export class MemoryAgentTelemetrySink implements AgentTelemetrySink {
  readonly events: AgentTelemetryEvent[] = [];
  async write(event: AgentTelemetryEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }
}
