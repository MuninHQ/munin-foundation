import type { ExecutionProvider, ProviderRequest, ProviderResponse } from './providers.js';

export interface CouncilSeat {
  id: string;
  title: string;
  capability: string;
  lens: string;
}

export interface CouncilRequest {
  objective: string;
  context?: Record<string, unknown>;
  seats?: CouncilSeat[];
}

export interface CouncilSeatResult {
  seat: CouncilSeat;
  response: ProviderResponse;
}

export interface CouncilResult {
  objective: string;
  seats: CouncilSeatResult[];
  synthesis: ProviderResponse;
}

export const DEFAULT_COUNCIL: CouncilSeat[] = [
  { id: 'strategist', title: 'Strategist', capability: 'strategy', lens: 'Clarify goals, trade-offs, sequencing and leverage.' },
  { id: 'skeptic', title: 'Skeptic', capability: 'review', lens: 'Find weak assumptions, risks, failure modes and missing evidence.' },
  { id: 'operator', title: 'Operator', capability: 'execute', lens: 'Turn the objective into concrete actions, dependencies and next steps.' },
];

function seatRequest(objective: string, context: Record<string, unknown>, seat: CouncilSeat): ProviderRequest {
  return {
    taskId: `council-${seat.id}-${Date.now()}`,
    objective,
    title: `${seat.title} assessment`,
    capability: seat.capability,
    expectedOutput: `${seat.lens} Produce a concise recommendation with rationale and actions.`,
    context,
  };
}

export class CouncilOrchestrator {
  constructor(private readonly provider: ExecutionProvider) {}

  async deliberate(request: CouncilRequest): Promise<CouncilResult> {
    const seats = request.seats?.length ? request.seats : DEFAULT_COUNCIL;
    const context = request.context ?? {};
    const opinions = await Promise.all(seats.map(async seat => ({
      seat,
      response: await this.provider.execute(seatRequest(request.objective, context, seat)),
    })));

    const synthesisRequest: ProviderRequest = {
      taskId: `council-synthesis-${Date.now()}`,
      objective: request.objective,
      title: 'Council synthesis',
      capability: 'synthesis',
      expectedOutput: 'Reconcile the council opinions into one decision. State recommendation, rationale, risks and next actions. Do not average conflicting views; resolve them.',
      context: {
        ...context,
        councilOpinions: opinions.map(item => ({
          seat: item.seat.id,
          title: item.seat.title,
          opinion: item.response.output,
        })),
      },
    };

    return {
      objective: request.objective,
      seats: opinions,
      synthesis: await this.provider.execute(synthesisRequest),
    };
  }
}
