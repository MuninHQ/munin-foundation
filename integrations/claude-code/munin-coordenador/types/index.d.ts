export type MuninSource = { id: string; label: string; available: boolean; updatedAt?: string; stale: boolean; detail?: string }

export type MuninDelegation = { id: string; objective: string; tier: string; status: string; createdAt: string; finishedAt?: string; reason?: string }

export type MuninStatus = {
  generatedAt: string
  severity: 'ok' | 'attention' | 'blocked' | 'unavailable'
  sources: MuninSource[]
  projects: Array<{ id: string; name: string; priority: string; status: string; updatedAt: string; hasNextAction: boolean; blockers: number }>
  work: { plansRunning: number; plansDone: number; plansFailed: number; plansBlocked: number; engineeringActive: number; engineeringFailed: number; engineeringNeedsUser: number }
  approvals: { pending: number; oldestPendingAt?: string }
  delegations: { running: number; limit: number; recent: MuninDelegation[] }
  attention: string[]
  controlRoomReady: boolean
}

/** What the pane draws: the last reading of Munin's canonical status, or why there is none. */
export type MuninSnapshot = {
  status?: MuninStatus
  fetchedAt?: string
  error?: string
  latencyMs?: number
  inFlight: number
  /** Habblaud (observabilidade): só disponibilidade e contagens do GET /api/mod/summary, nunca conteúdo. */
  habblaud?: { available: boolean; counts: Array<{ key: string; count: number }>; checkedAt: string }
}

declare module 'claude-code' {
  interface PluginState {
    'munin-coordenador': { snapshot: MuninSnapshot }
  }
}
