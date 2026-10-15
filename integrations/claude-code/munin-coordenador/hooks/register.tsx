import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { MuninSnapshot } from '../types'
import { delegateArgv, formatDelegation, habblaudCounts, isHumanOrigin, isOutdated, parseDelegateArgs, parseStatus, statusLine, type DelegationResult } from './core'

const PANE = 'munin-coordenador'
const MAX_IN_FLIGHT = 2
const snapshot = atom({ plugin: 'munin-coordenador', key: 'snapshot' } as const, { inFlight: 0 } as MuninSnapshot)

const COLORS = { ok: 'success', attention: 'warning', blocked: 'error', unavailable: 'inactive' } as const

type Config = { root: string; nodeBin: string; pollMinutes: string; script: string; habblaudPort: string }

async function cli($: EngineInterface, cfg: Config, args: string[], timeoutMs: number) {
  return $.process.run([cfg.nodeBin, cfg.script, ...args], { cwd: cfg.root, timeoutMs })
}

// Deterministic read of Munin's canonical status: one child process, no model call.
async function refresh($: EngineInterface, cfg: Config) {
  const started = await $.clock.now()
  try {
    const run = await cli($, cfg, ['status', '--json'], 20_000)
    const status = parseStatus(run.stdout)
    const latencyMs = (await $.clock.now()) - started
    await update($, snapshot, prev => ({ ...prev, status, error: undefined, fetchedAt: new Date(started).toISOString(), latencyMs }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await update($, snapshot, prev => ({ ...prev, status: undefined, fetchedAt: new Date(started).toISOString(), error: `fonte indisponível: ${message.slice(0, 200)}` }))
  }
  if (cfg.habblaudPort !== 'off') await readHabblaud($, cfg)
  const current = await read($, snapshot)
  $.ui.status(statusLine(current, isOutdated(current, await $.clock.now(), cfg.pollMinutes)))
}

// Habblaud stays the observability layer: one read-only GET with a 2 s cap, never throws, never writes.
async function readHabblaud($: EngineInterface, cfg: Config) {
  const checkedAt = new Date(await $.clock.now()).toISOString()
  try {
    const res = await Promise.race([
      $.http.fetch(`http://127.0.0.1:${cfg.habblaudPort}/api/mod/summary`, { headers: { accept: 'application/json' } }),
      $.clock.sleep(2_000).then(() => undefined),
    ])
    const counts = res && res.ok ? habblaudCounts(res.text) : undefined
    await update($, snapshot, prev => ({ ...prev, habblaud: { available: counts !== undefined, counts: counts ?? [], checkedAt } }))
  } catch {
    await update($, snapshot, prev => ({ ...prev, habblaud: { available: false, counts: [], checkedAt } }))
  }
}

export const register: Register = (on, options) => {
  const root = String(options.muninRoot ?? 'D:/Dev/munin-foundation-git').replace(/[\\/]+$/, '')
  const nodeBin = String(options.node ?? 'node')
  const pollMinutes = String(options.pollMinutes ?? '5')
  const script = `${root}/dist/src/coordinator-cli.js`
  const cfg: Config = { root, nodeBin, pollMinutes, script, habblaudPort: String(options.habblaudPort ?? '4747') }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'munin', description: 'Abre o painel do Munin Coordenador (status canônico, aprovações, delegações).' })
    await $.command.register({ name: 'munin-sitrep', description: 'SITREP determinístico do runtime canônico do Munin: resumo e três próximos passos.' })
    await $.command.register({ name: 'munin-delegar', description: 'Delega uma tarefa delimitada e autorizada ao executor do Munin (máx. 2 simultâneas).', argumentHint: '[--tier deterministic|local|economy|strong] [--justificar "por quê"] <objetivo>' })
    await $.command.register({ name: 'munin-atualizar', description: 'Relê agora o status canônico do Munin.' })
    refresh($, cfg).catch(() => undefined)
    if (pollMinutes !== 'off') $.clock.every(Number(pollMinutes) * 60_000, () => refresh($, cfg).catch(() => undefined))
    if (options.panel === 'auto') void $.ui.open({ id: PANE, title: 'Munin Coordenador' })
    return next(e)
  })

  on('command.run', { command: 'munin' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Munin Coordenador' })
    refresh($, cfg).catch(() => undefined)
    return { text: 'Painel do Munin Coordenador aberto.' }
  })

  on('command.run', { command: 'munin-atualizar' }, async $ => {
    await refresh($, cfg)
    const snap = await read($, snapshot)
    return { text: snap.status ? `Status do Munin relido (${snap.latencyMs ?? '?'} ms).` : (snap.error ?? 'Munin indisponível.') }
  })

  on('command.run', { command: 'munin-sitrep' }, async $ => {
    try {
      const run = await cli($, cfg, ['sitrep'], 30_000)
      const text = run.stdout.trim()
      if (!text) return { text: `SITREP indisponível: a CLI do coordenador não respondeu (exit ${run.exitCode}). ${run.stderr.slice(0, 200)}` }
      return { text: run.exitCode === 0 ? text : `${text}\n\n(fonte canônica indisponível ou incompleta: exit ${run.exitCode})` }
    } catch (error) {
      return { text: `SITREP indisponível: ${error instanceof Error ? error.message : String(error)}. Verifique muninRoot (${root}) e npm run build:core.` }
    }
  })

  on('command.run', { command: 'munin-delegar' }, async ($, e) => {
    // Authorization is the person's own gesture: a peer session, plugin, schedule or SDK turn never authorizes.
    const originKind = e.origin?.kind ?? 'desconhecida'
    if (!isHumanOrigin(originKind)) return { text: `Delegação recusada: origem '${originKind}' não é autorização humana. Peça ao André para digitar /munin-delegar diretamente.` }
    const parsed = parseDelegateArgs(e.args)
    if ('error' in parsed) return { text: `Delegação não enviada: ${parsed.error}` }
    const current = await read($, snapshot)
    if (current.inFlight >= MAX_IN_FLIGHT) return { text: `Delegação não enviada: já há ${current.inFlight} delegações em andamento nesta sessão (máx. ${MAX_IN_FLIGHT}).` }
    await update($, snapshot, prev => ({ ...prev, inFlight: prev.inFlight + 1 }))
    try {
      const run = await cli($, cfg, delegateArgv(script, parsed, originKind).slice(1), 600_000)
      const result = JSON.parse(run.stdout.trim().split('\n').filter(Boolean).pop() ?? '{}') as DelegationResult
      if (!result.id) return { text: `Delegação sem resposta válida do Munin (exit ${run.exitCode}). ${run.stderr.slice(0, 300)}` }
      return { text: formatDelegation(result) }
    } catch (error) {
      return { text: `Delegação não executada: ${error instanceof Error ? error.message : String(error)}` }
    } finally {
      await update($, snapshot, prev => ({ ...prev, inFlight: Math.max(0, prev.inFlight - 1) }))
      refresh($, cfg).catch(() => undefined)
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const snap = await read($, snapshot)
    const now = await $.clock.now()
    const outdated = isOutdated(snap, now, pollMinutes)
    const s = snap.status
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text weight="bold" color={s ? COLORS[s.severity] : 'inactive'}>{s ? `Munin · ${s.severity}` : 'Munin · indisponível'}</Text>
          <Button key="refresh" label="Atualizar" hotkey="r" onPress={() => refresh($, cfg).catch(() => undefined)} />
        </Box>
        <Text dimColor>
          {snap.fetchedAt ? `lido ${snap.fetchedAt}${snap.latencyMs !== undefined ? ` · ${snap.latencyMs} ms` : ''}` : 'ainda não lido'}
          {outdated ? ' · DESATUALIZADO' : ''}
        </Text>
        {!s && <Text color="error">{snap.error ?? 'Sem leitura da fonte canônica.'}</Text>}
        {s && (
          <Box flexDirection="column">
            <Text weight="bold">Fontes</Text>
            {s.sources.map(src => (
              <Text key={src.id} color={!src.available ? 'error' : src.stale ? 'warning' : undefined} dimColor={src.available && !src.stale}>
                {src.available ? (src.stale ? '! ' : '✓ ') : '✗ '}{src.label}{src.updatedAt ? ` · ${src.updatedAt}` : ''}{src.detail ? ` · ${src.detail}` : ''}
              </Text>
            ))}
            <Text weight="bold">Aprovações</Text>
            <Text color={s.approvals.pending ? 'warning' : undefined}>{s.approvals.pending} pendente(s){s.approvals.oldestPendingAt ? ` · mais antiga ${s.approvals.oldestPendingAt}` : ''} — decisão humana no Munin</Text>
            <Text weight="bold">Trabalho</Text>
            <Text>planos: {s.work.plansRunning} em execução · {s.work.plansDone} concluídos · {s.work.plansFailed} falha</Text>
            <Text>engenharia: {s.work.engineeringActive} ativos · {s.work.engineeringFailed} falha · {s.work.engineeringNeedsUser} aguardando usuário</Text>
            <Text weight="bold">Delegações {s.delegations.running}/{s.delegations.limit}{snap.inFlight ? ` · ${snap.inFlight} enviando` : ''}</Text>
            {s.delegations.recent.length === 0 && <Text dimColor>nenhuma ainda</Text>}
            {s.delegations.recent.slice(0, 5).map(d => (
              <Text key={d.id} color={d.status === 'completed' ? 'success' : d.status === 'running' ? undefined : 'warning'}>
                {d.status} · {d.tier} · {d.objective}
              </Text>
            ))}
            <Text weight="bold">Projetos ({s.projects.length})</Text>
            {s.projects.slice(0, 8).map(p => (
              <Text key={p.id} dimColor={p.blockers === 0}>{p.priority} {p.name} · {p.status}{p.blockers ? ` · ${p.blockers} bloqueio(s)` : ''}</Text>
            ))}
            {s.attention.length > 0 && <Text weight="bold">Atenção</Text>}
            {s.attention.slice(0, 4).map((line, i) => <Text key={`a${i}`} color="warning">{line}</Text>)}
          </Box>
        )}
        {snap.habblaud && (
          <Text dimColor={snap.habblaud.available}>
            Habblaud: {snap.habblaud.available ? `no ar · ${snap.habblaud.counts.map(c => `${c.key} ${c.count}`).join(' · ') || 'sem contagens'} · detalhes em /habblaud` : 'fora do ar ou sem resposta'}
          </Text>
        )}
        <Text dimColor>Fonte: {root} · /munin-sitrep · /munin-delegar</Text>
      </Box>
    )
  })
}
