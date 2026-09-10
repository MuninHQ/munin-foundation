import { randomUUID } from 'node:crypto';

export type WatchComparator = 'changed' | 'gte' | 'lte' | 'equals';

export interface WatchDefinition {
  id?: string;
  name: string;
  comparator: WatchComparator;
  target?: string | number | boolean;
  enabled?: boolean;
  cooldownMs?: number;
}

export interface WatchSample {
  value: string | number | boolean | null;
  sampledAt: string;
}

export interface WatchEvaluation {
  watchId: string;
  name: string;
  triggered: boolean;
  reason: string;
  current: WatchSample;
  previous?: WatchSample;
}

export function evaluateWatch(
  definition: WatchDefinition,
  current: WatchSample,
  previous?: WatchSample,
): WatchEvaluation {
  const watchId = definition.id ?? randomUUID();
  if (definition.enabled === false) return { watchId, name: definition.name, triggered: false, reason: 'watch-disabled', current, previous };

  let triggered = false;
  switch (definition.comparator) {
    case 'changed':
      triggered = Boolean(previous) && previous?.value !== current.value;
      break;
    case 'equals':
      triggered = current.value === definition.target;
      break;
    case 'gte':
      triggered = typeof current.value === 'number' && typeof definition.target === 'number' && current.value >= definition.target;
      break;
    case 'lte':
      triggered = typeof current.value === 'number' && typeof definition.target === 'number' && current.value <= definition.target;
      break;
  }

  return {
    watchId,
    name: definition.name,
    triggered,
    reason: triggered ? `condition-met:${definition.comparator}` : `condition-not-met:${definition.comparator}`,
    current,
    previous,
  };
}
