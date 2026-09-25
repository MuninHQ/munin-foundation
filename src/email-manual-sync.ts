import { CareerInboxStore } from './career-inbox.js';
import { syncCareerInbox } from './email-providers.js';
import { EmailWorkerHealthStore } from './email-worker-health.js';

const MANUAL_SYNC_COOLDOWN_MS = 60 * 60_000;
const THROTTLE_FALLBACK_MAX_AGE_MS = 2 * 60 * 60_000;

export type ManualEmailSyncResult = Awaited<ReturnType<typeof syncCareerInbox>> & {
  skipped?: boolean;
  throttled?: boolean;
  reason?: 'recent-worker-sync' | 'provider-rate-limit';
  lastSyncAt?: string;
};

export async function manualSyncCareerInbox(now = Date.now()): Promise<ManualEmailSyncResult> {
  const healthStore = new EmailWorkerHealthStore();
  const health = await healthStore.read();
  const lastSuccess = Date.parse(health?.lastSuccessAt ?? '');
  const age = Number.isFinite(lastSuccess) ? now - lastSuccess : Number.POSITIVE_INFINITY;
  if (age >= 0 && age < MANUAL_SYNC_COOLDOWN_MS) {
    return { providers: health?.providers ?? [], added: 0, duplicates: 0, totalFetched: 0, windowDays: 30, skipped: true, reason: 'recent-worker-sync', lastSyncAt: health?.lastSuccessAt };
  }

  try {
    const result = await syncCareerInbox();
    await healthStore.success({ providers: result.providers, needsConnection: result.needsConnection, summary: result.needsConnection ? 'Mailbox connection required.' : `${result.totalFetched} fetched · ${result.added} added` });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/gmail sync failed:\s*403/i.test(message) && age < THROTTLE_FALLBACK_MAX_AGE_MS) {
      const cached = await new CareerInboxStore().load();
      return { providers: health?.providers ?? ['gmail'], added: 0, duplicates: cached.messages.length, totalFetched: 0, windowDays: 30, skipped: true, throttled: true, reason: 'provider-rate-limit', lastSyncAt: health?.lastSuccessAt };
    }
    throw error;
  }
}
