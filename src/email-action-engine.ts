import { randomUUID } from 'node:crypto';
import { CareerInboxStore, type CareerEmail } from './career-inbox.js';
import { ContextStore } from './store.js';
import type { Action } from './types.js';

const autoReasons = new Set([
  'Explicit response requested',
  'Approval or signature requested',
  'Payment or billing action may be due',
  'Confirmation requested',
]);

export interface EmailActionPromotionResult {
  created: number;
  review: number;
  actionIds: string[];
  reviewMessageIds: string[];
}

function actionTitle(message: CareerEmail): string {
  return `Email: ${message.subject}${message.actionReason ? ` — ${message.actionReason}` : ''}`;
}

export async function promoteEmailActions(root?: string): Promise<EmailActionPromotionResult> {
  const context = new ContextStore(root);
  const inboxStore = new CareerInboxStore(root);
  const [state, inbox] = await Promise.all([context.load(), inboxStore.load()]);
  const actionIds: string[] = [];
  const reviewMessageIds: string[] = [];

  for (const message of inbox.messages) {
    if (message.handled || message.linkedActionId || message.attention !== 'general_action' || !message.needsAction) continue;
    if (!message.actionReason || !autoReasons.has(message.actionReason)) {
      reviewMessageIds.push(message.id);
      continue;
    }

    const now = new Date().toISOString();
    const action: Action = {
      id: `act-${randomUUID().slice(0, 8)}`,
      title: actionTitle(message),
      priority: 'P1',
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    };
    state.actions.push(action);
    message.linkedActionId = action.id;
    message.handled = true;
    actionIds.push(action.id);
    await context.event('action.created', 'action', action.id, {
      title: action.title,
      priority: action.priority,
      source: 'email',
      provider: message.provider,
      providerMessageId: message.providerMessageId,
      emailId: message.id,
      actionReason: message.actionReason,
    });
  }

  if (actionIds.length) {
    await context.save(state);
    await inboxStore.save(inbox);
  }

  return { created: actionIds.length, review: reviewMessageIds.length, actionIds, reviewMessageIds };
}
