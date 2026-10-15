import type { MuninSnapshot, MuninStatus } from '../types'

/** Origins a person's own gesture produces. Everything else (peer sessions, plugins, schedules, SDK) is not authorization. */
export const HUMAN_ORIGINS = ['composer', 'bridge'] as const
export type HumanOrigin = (typeof HUMAN_ORIGINS)[number]

export function isHumanOrigin(kind: string): kind is HumanOrigin {
  return (HUMAN_ORIGINS as readonly string[]).includes(kind)
}

export const TIERS = ['deterministic', 'local', 'economy', 'strong'] as const
export type Tier = (typeof TIERS)[number]

export type DelegateArgs = { objective: string; tier: Tier; justification?: string } | { error: string }

/** `/munin-delegar [--tier T] [--justificar "texto"] <objetivo>` */
export function parseDelegateArgs(raw: string): DelegateArgs {
  let rest = raw.trim()
  let tier: Tier = 'deterministic'
  let justification: string | undefined
  for (;;) {
    const tierMatch = rest.match(/^--tier\s+(\S+)\s*/)
    const tierName = tierMatch?.[1]
    if (tierMatch && tierName !== undefined) {
      if (!(TIERS as readonly string[]).includes(tierName)) return { error: `tier inválido: ${tierName} (use ${TIERS.join(', ')})` }
      tier = tierName as Tier
      rest = rest.slice(tierMatch[0].length)
      continue
    }
    const justMatch = rest.match(/^--justificar\s+"([^"]*)"\s*/)
    if (justMatch) {
      justification = justMatch[1] ?? ''
      rest = rest.slice(justMatch[0].length)
      continue
    }
    break
  }
  const objective = rest.trim()
  if (!objective) return { error: 'informe o objetivo: /munin-delegar [--tier deterministic|local|economy|strong] [--justificar "por quê"] <objetivo>' }
  return { objective, tier, justification }
}

export function delegateArgv(script: string, args: { objective: string; tier: Tier; justification?: string }, via: HumanOrigin): string[] {
  const argv = [script, 'delegate', '--objective', args.objective, '--tier', args.tier, '--authorized-via', via, '--actor', 'claude-code-mod', '--json']
  if (args.justification) argv.push('--justification', args.justification)
  return argv
}

/** A reading older than twice the poll interval (or 15 min when polling is off) is shown as outdated. */
export function isOutdated(snapshot: MuninSnapshot, nowMs: number, pollMinutes: string): boolean {
  if (!snapshot.fetchedAt) return true
  const window = pollMinutes === 'off' ? 15 : Number(pollMinutes) * 2
  return nowMs - Date.parse(snapshot.fetchedAt) > window * 60_000
}

export function parseStatus(stdout: string): MuninStatus {
  const parsed = JSON.parse(stdout.trim().split('\n').filter(Boolean).pop() ?? '') as MuninStatus
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sources) || !parsed.generatedAt) throw new Error('resposta do coordenador fora do contrato')
  return parsed
}

const SEVERITY_LABEL: Record<string, string> = { ok: 'ok', attention: 'atenção', blocked: 'bloqueado', unavailable: 'indisponível' }

export function statusLine(snapshot: MuninSnapshot, outdated: boolean): string {
  if (!snapshot.status) return `Munin: indisponível${snapshot.error ? '' : ' (sem leitura)'}`
  const s = snapshot.status
  const parts = [`Munin: ${SEVERITY_LABEL[s.severity] ?? s.severity}`]
  if (s.approvals.pending) parts.push(`${s.approvals.pending} aprov.`)
  parts.push(`deleg. ${s.delegations.running}/${s.delegations.limit}`)
  if (outdated) parts.push('desatualizado')
  return parts.join(' · ')
}

export type DelegationResult = { id: string; status: string; tier: string; reason?: string; recommendation?: string; planId?: string; planStatus?: string; nextStep?: string; durationMs?: number; evidence?: Array<{ task: string; status: string; providerId?: string; simulated?: boolean }> }

export function formatDelegation(result: DelegationResult): string {
  const lines = [`Delegação ${result.id}: ${result.status} (tier ${result.tier})`]
  if (result.reason) lines.push(`Motivo: ${result.reason}`)
  if (result.recommendation) lines.push(`Recomendação: ${result.recommendation}`)
  if (result.planId) lines.push(`Plano: ${result.planId} → ${result.planStatus}${result.durationMs !== undefined ? ` em ${result.durationMs} ms` : ''}`)
  for (const item of result.evidence ?? []) lines.push(`  - ${item.task}: ${item.status} via ${item.providerId ?? '?'}${item.simulated ? ' (simulado)' : ''}`)
  if (result.nextStep) lines.push(`Próximo passo: ${result.nextStep}`)
  lines.push('Fonte: Munin coordinator-cli (ledger data/runtime/coordinator/delegations.json + Memory Ledger).')
  return lines.join('\n')
}

/** Habblaud's summary shape is its own; we only count top-level arrays and numbers, never read their content. */
export function habblaudCounts(text: string): Array<{ key: string; count: number }> | undefined {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { return undefined }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  const counts: Array<{ key: string; count: number }> = []
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (Array.isArray(value)) counts.push({ key, count: value.length })
    else if (typeof value === 'number' && Number.isFinite(value)) counts.push({ key, count: value })
  }
  return counts.slice(0, 4)
}
