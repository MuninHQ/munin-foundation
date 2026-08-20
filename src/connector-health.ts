export type ConnectorState = 'healthy' | 'degraded' | 'blocked';
export type ConnectorRecovery = 'none' | 'retry' | 'refresh-session' | 'human-auth';

export interface ConnectorHealth {
  id: string;
  state: ConnectorState;
  lastSuccessAt?: string;
  error?: string;
  interactiveAuthRequired?: boolean;
}

export interface ConnectorRecoveryPlan {
  id: string;
  action: ConnectorRecovery;
  reason: string;
}

export function planConnectorRecovery(health: ConnectorHealth): ConnectorRecoveryPlan {
  if (health.state === 'healthy') return { id: health.id, action:'none', reason:'Connector is healthy.' };
  const error = (health.error ?? '').toLowerCase();
  if (health.interactiveAuthRequired || /2fa|mfa|oauth consent|login required/.test(error)) return { id: health.id, action:'human-auth', reason:'Interactive authentication is genuinely required.' };
  if (/expired|session|refresh token/.test(error)) return { id: health.id, action:'refresh-session', reason:'Session material appears stale and should be refreshed through the existing connector flow.' };
  return { id: health.id, action:'retry', reason:'No human-only boundary detected; retry/recovery should be attempted automatically.' };
}

export function summarizeConnectorFleet(items: ConnectorHealth[]) {
  return {
    total: items.length,
    healthy: items.filter(i=>i.state==='healthy').length,
    degraded: items.filter(i=>i.state==='degraded').length,
    blocked: items.filter(i=>i.state==='blocked').length,
    humanRequired: items.filter(i=>planConnectorRecovery(i).action==='human-auth').map(i=>i.id),
    autoRecoverable: items.filter(i=>['retry','refresh-session'].includes(planConnectorRecovery(i).action)).map(i=>i.id),
  };
}
