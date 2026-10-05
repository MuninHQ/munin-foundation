import { AdversarialReview, gitReviewSnapshot } from './adversarial-review.js';

export async function runAdversarialReviewCli(args: string[], repo = process.cwd()): Promise<unknown> {
  const service = new AdversarialReview(repo);
  const [action, base, head] = args;
  if (action === 'gate' && ['on', 'off', 'status'].includes(base)) {
    if (base !== 'status') await service.setGate(base === 'on');
    return { enabled: await service.gateEnabled(), scope: 'BUILD ALL final verification; no Git hook installed' };
  }
  if (action === 'stats') {
    const integrity = await service.ledger.verify();
    const records = await service.ledger.list(1000);
    return { integrity, recentRounds: records.length, consensusRounds: records.filter(item => item.metadata?.consensus === true).length, records };
  }
  if ((action === 'review' || action === 'check') && base) {
    const snapshot = await gitReviewSnapshot(repo, base, head ?? 'HEAD');
    const result = action === 'review' ? await service.run(snapshot) : await service.checkGate(snapshot);
    if ('consensus' in result ? !result.consensus : !result.allowed) process.exitCode = 2;
    return result;
  }
  throw new Error('Usage: munin cross-review review|check <base-ref> [head-ref] | gate on|off|status | stats');
}
