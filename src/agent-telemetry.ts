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
export type AgentSpanType='task'|'agent'|'turn'|'generation'|'tool'|'guardrail'|'handoff'|'verification';

export interface AgentTelemetryEvent {
  name: AgentTelemetryEventName;
  at: string;
  runId: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  spanType?: AgentSpanType;
  taskId?: string;
  agentId?: string;
  providerId?: string;
  durationMs?: number;
  cost?: number;
  outcome?: string;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentTelemetrySink { write(event: AgentTelemetryEvent): Promise<void> }

export class JsonlAgentTelemetrySink implements AgentTelemetrySink {
  readonly path: string;
  private tail: Promise<void> = Promise.resolve();
  constructor(path = runtimePath('telemetry', 'agent-events.jsonl')) { this.path = resolve(path); }
  write(event: AgentTelemetryEvent): Promise<void> {
    const operation = this.tail.then(async () => { await mkdir(dirname(this.path), { recursive: true }); await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf8'); });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
}

export function otelGenAiAttributes(event:AgentTelemetryEvent):Record<string,unknown>{
  const metadata=event.metadata??{};
  const attrs:Record<string,unknown>={
    'gen_ai.operation.name':metadata['gen_ai.operation.name']??event.spanType??event.name,
    'munin.run.id':event.runId,
  };
  if(event.agentId)attrs['gen_ai.agent.name']=event.agentId;
  if(event.providerId)attrs['gen_ai.provider.name']=event.providerId;
  for(const key of ['gen_ai.request.model','gen_ai.usage.input_tokens','gen_ai.usage.output_tokens','gen_ai.response.finish_reasons'])if(metadata[key]!==undefined)attrs[key]=metadata[key];
  if(event.durationMs!==undefined)attrs['munin.duration_ms']=event.durationMs;
  if(event.cost!==undefined)attrs['munin.cost_usd']=event.cost;
  return attrs;
}

export class AgentTelemetry {
  private readonly pending = new Set<Promise<void>>();
  constructor(private readonly sink: AgentTelemetrySink,private readonly onError: (error: unknown) => void = () => undefined) {}
  emit(event: Omit<AgentTelemetryEvent, 'at'> & { at?: string }): void {
    const normalized = redactSecrets<AgentTelemetryEvent>({ ...event, at: event.at ?? new Date().toISOString() });
    const operation = this.sink.write(normalized);
    this.pending.add(operation);
    void operation.catch(this.onError).finally(() => this.pending.delete(operation));
  }
  async flush(timeoutMs = 1_000): Promise<void> {
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new Error('telemetry flush timeout must be non-negative');
    const pending = [...this.pending]; if (!pending.length) return;
    await new Promise<void>(resolveFlush => { let settled=false; const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);resolveFlush()}; const timer=setTimeout(finish,timeoutMs); void Promise.allSettled(pending).then(finish); });
  }
}
export class MemoryAgentTelemetrySink implements AgentTelemetrySink { readonly events:AgentTelemetryEvent[]=[];async write(event:AgentTelemetryEvent):Promise<void>{this.events.push(structuredClone(event));} }
