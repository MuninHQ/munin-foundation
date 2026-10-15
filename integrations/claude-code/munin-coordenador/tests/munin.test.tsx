import { describe, expect, mock, test } from 'claude-code/testing'

import { formatDelegation, habblaudCounts, isHumanOrigin, isOutdated, parseDelegateArgs, statusLine } from '../hooks/core'
import type { MuninStatus } from '../types'

const status: MuninStatus = {
  generatedAt: '2026-10-15T18:00:00.000Z',
  severity: 'attention',
  sources: [
    { id: 'operator-sitrep', label: 'Operator SITREP / Control Room', available: true, updatedAt: '2026-10-15T18:00:00.000Z', stale: false },
    { id: 'approval-queue', label: 'Approval queue', available: false, stale: false, detail: 'source file not found' },
  ],
  projects: [{ id: 'p1', name: 'Projeto sintético', priority: 'P1', status: 'active', updatedAt: '2026-10-15T17:00:00.000Z', hasNextAction: true, blockers: 0 }],
  work: { plansRunning: 1, plansDone: 3, plansFailed: 0, plansBlocked: 0, engineeringActive: 0, engineeringFailed: 2, engineeringNeedsUser: 0 },
  approvals: { pending: 2, oldestPendingAt: '2026-10-14T10:00:00.000Z' },
  delegations: { running: 1, limit: 2, recent: [{ id: 'dlg-1', objective: 'Resumir lista sintética', tier: 'deterministic', status: 'completed', createdAt: '2026-10-15T17:59:00.000Z' }] },
  attention: ['2 approval(s) waiting for a human decision.'],
  controlRoomReady: true,
}

const presentation = { isFullscreen: true, columns: 100 }
const paneProps = { title: 'Munin Coordenador', isFocused: false, bodyColumns: 80, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} }
const cmd = (command: string, args = '', kind: 'composer' | 'bridge' | 'peer' | 'plugin' = 'composer') => ({ command, args, origin: { kind } as never, presentation })
const run = (exitCode: number, stdout: string, stderr = '') => ({ value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false } })

describe('core', () => {
  test('parses tier, justification and objective', () => {
    expect(parseDelegateArgs('Resumir lista')).toEqual({ objective: 'Resumir lista', tier: 'deterministic', justification: undefined })
    expect(parseDelegateArgs('--tier strong --justificar "refatoração ampla com risco alto" Revisar módulo')).toEqual({ objective: 'Revisar módulo', tier: 'strong', justification: 'refatoração ampla com risco alto' })
    expect(parseDelegateArgs('--tier caro x')).toEqual({ error: expect.stringContaining('tier inválido') })
    expect(parseDelegateArgs('   ')).toEqual({ error: expect.stringContaining('informe o objetivo') })
  })

  test('only a person’s own gesture counts as authorization', () => {
    expect(isHumanOrigin('composer')).toBe(true)
    expect(isHumanOrigin('bridge')).toBe(true)
    for (const kind of ['peer', 'plugin', 'sdk', 'scheduled-trigger', 'task-notification', 'unclassified']) expect(isHumanOrigin(kind)).toBe(false)
  })

  test('readings older than twice the poll interval are outdated', () => {
    const fetchedAt = '2026-10-15T18:00:00.000Z'
    const at = (min: number) => Date.parse(fetchedAt) + min * 60_000
    expect(isOutdated({ inFlight: 0, fetchedAt }, at(9), '5')).toBe(false)
    expect(isOutdated({ inFlight: 0, fetchedAt }, at(11), '5')).toBe(true)
    expect(isOutdated({ inFlight: 0 }, at(0), '5')).toBe(true)
  })

  test('status line and delegation text carry source and simulation honestly', () => {
    expect(statusLine({ inFlight: 0, status }, true)).toBe('Munin: atenção · 2 aprov. · deleg. 1/2 · desatualizado')
    expect(statusLine({ inFlight: 0, error: 'x' }, false)).toBe('Munin: indisponível')
    const text = formatDelegation({ id: 'dlg-1', status: 'completed', tier: 'deterministic', planId: 'obj-1', planStatus: 'DONE', durationMs: 12, evidence: [{ task: 'Plan objective', status: 'DONE', providerId: 'deterministic-local', simulated: true }] })
    expect(text).toContain('(simulado)')
    expect(text).toContain('Fonte: Munin coordinator-cli')
  })
})

describe('habblaud', () => {
  test('counts only top-level arrays and numbers, never content', () => {
    expect(habblaudCounts(JSON.stringify({ agents: [{ name: 'x', text: 'segredo' }, {}], waiting: 1, note: 'texto' }))).toEqual([{ key: 'agents', count: 2 }, { key: 'waiting', count: 1 }])
    expect(habblaudCounts('not json')).toBeUndefined()
    expect(habblaudCounts('[1,2]')).toBeUndefined()
  })
})

describe('mod', () => {
  test('reads the canonical status deterministically and draws it on terminal and desktop', async ($, on) => {
    mock.clock(on)
    const calls: string[][] = []
    on('process.run', ($, e) => {
      calls.push([...e.argv])
      return run(0, JSON.stringify(status))
    })
    const result = await $.command.run(cmd('munin-atualizar'))
    expect(result.text).toContain('Status do Munin relido')
    expect(calls[0]?.slice(1)).toEqual(['D:/Dev/munin-foundation-git/dist/src/coordinator-cli.js', 'status', '--json'])
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'munin-coordenador', surface, component: 'Pane', requestId: 'munin-coordenador', props: paneProps })
      expect((await ui.find({ text: '2 pendente(s)' }))).toBeDefined()
      expect((await ui.find({ text: 'Approval queue' }))).toBeDefined()
      expect((await ui.find({ key: 'refresh' }))).toBeDefined()
    }
  })

  test('an unavailable source is shown as unavailable, never as a fabricated status', async ($, on) => {
    mock.clock(on)
    on('process.run', () => run(1, '', 'Cannot find module dist/src/coordinator-cli.js'))
    const result = await $.command.run(cmd('munin-atualizar'))
    expect(result.text).toContain('fonte indisponível')
    const ui = await $.ui.mount({ plugin: 'munin-coordenador', surface: 'terminal', component: 'Pane', requestId: 'munin-coordenador', props: paneProps })
    expect(await ui.find({ text: 'Munin · indisponível' })).toBeDefined()
    expect(await ui.find({ text: 'Aprovações' })).toBeUndefined()
  })

  test('SITREP relays the CLI text and flags an unavailable canonical source', async ($, on) => {
    mock.clock(on)
    on('process.run', () => run(2, 'SITREP Munin\n\nPróximos passos:\n1. a\n2. b\n3. c'))
    const result = await $.command.run(cmd('munin-sitrep'))
    expect(result.text).toContain('Próximos passos')
    expect(result.text).toContain('fonte canônica indisponível')
  })

  test('a delegation sent by another session or plugin is refused before any process runs', async ($, on) => {
    mock.clock(on)
    const calls: string[][] = []
    on('process.run', ($, e) => {
      calls.push([...e.argv])
      return run(0, JSON.stringify(status))
    })
    for (const kind of ['peer', 'plugin'] as const) {
      const result = await $.command.run(cmd('munin-delegar', 'Resumir lista sintética', kind))
      expect(result.text).toContain('não é autorização humana')
    }
    expect(calls.some(argv => argv.includes('delegate'))).toBe(false)
  })

  test('a delegation typed by the person reaches Munin with its provenance and reports the result', async ($, on) => {
    mock.clock(on)
    const calls: string[][] = []
    on('process.run', ($, e) => {
      calls.push([...e.argv])
      if (e.argv.includes('delegate')) return run(0, JSON.stringify({ id: 'dlg-9', status: 'completed', tier: 'deterministic', planId: 'obj-9', planStatus: 'DONE', durationMs: 7, evidence: [{ task: 'Plan objective', status: 'DONE', providerId: 'deterministic-local', simulated: true }], nextStep: 'Revisar' }))
      return run(0, JSON.stringify(status))
    })
    const result = await $.command.run(cmd('munin-delegar', 'Resumir lista sintética', 'composer'))
    expect(result.text).toContain('Delegação dlg-9: completed')
    expect(result.text).toContain('(simulado)')
    const delegate = calls.find(argv => argv.includes('delegate')) ?? []
    expect(delegate).toEqual(expect.arrayContaining(['--objective', 'Resumir lista sintética', '--tier', 'deterministic', '--authorized-via', 'composer']))
  })

  test('the session caps its own in-flight delegations at two', async ($, on) => {
    const clock = mock.clock(on)
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    on('process.run', async ($, e) => {
      if (e.argv.includes('delegate')) { await gate; return run(0, JSON.stringify({ id: 'dlg-x', status: 'completed', tier: 'deterministic' })) }
      return run(0, JSON.stringify(status))
    })
    const first = $.command.run(cmd('munin-delegar', 'Tarefa sintética um'))
    const second = $.command.run(cmd('munin-delegar', 'Tarefa sintética dois'))
    for (let i = 0; i < 5; i++) await clock.advance(0)
    const third = await $.command.run(cmd('munin-delegar', 'Tarefa sintética três'))
    expect(third.text).toContain('máx. 2')
    release()
    expect((await first).text).toContain('completed')
    expect((await second).text).toContain('completed')
  })
})
