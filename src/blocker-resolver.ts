export type BlockerBoundary = 'repository' | 'cloud' | 'device' | 'credential' | '2fa' | 'financial' | 'irreversible' | 'permission' | 'strategic';
export interface BlockerResolution { boundary: BlockerBoundary; humanRequired: boolean; deferLane: boolean; strategy: string }
function n(value: string): string { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
export function resolveBlocker(blocker: string): BlockerResolution {
  const text = n(blocker);
  const human: Array<[BlockerBoundary, string[]]> = [
    ['2fa', ['2fa','mfa','verification code','codigo de verificacao']],
    ['credential', ['password','senha','credential entry','login interativo']],
    ['financial', ['payment','pagamento','billing','purchase','comprar']],
    ['irreversible', ['irreversible','irreversivel','destroy production','delete production']],
    ['permission', ['permission denied','forbidden','owner approval','sem permissao']],
    ['strategic', ['strategic ambiguity','decisao estrategica sem criterio']],
  ];
  for (const [boundary, terms] of human) if (terms.some(term => text.includes(term))) return { boundary, humanRequired: true, deferLane: true, strategy: 'Queue this lane for explicit human action; continue every independent safe lane.' };
  if (['iphone','windows host','physical device','maquina local','pc local'].some(term => text.includes(term))) return { boundary: 'device', humanRequired: true, deferLane: true, strategy: 'Queue device acceptance; attempt approved host bridge if available; continue cloud/repository lanes.' };
  if (['github','repository','branch','merge','ci'].some(term => text.includes(term))) return { boundary: 'repository', humanRequired: false, deferLane: false, strategy: 'Retry, inspect CI/logs, use alternate repository path, then narrow the change.' };
  return { boundary: 'cloud', humanRequired: false, deferLane: false, strategy: 'Retry with backoff, alternate available connector/tool, or defer only this lane.' };
}
