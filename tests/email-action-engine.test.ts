import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CareerInboxStore, type CareerEmail } from '../src/career-inbox.js';
import { promoteEmailActions } from '../src/email-action-engine.js';
import { ContextStore } from '../src/store.js';
import { classifyEmailUrgency } from '../src/email-urgency.js';

function message(id:string, actionReason:string, overrides:Partial<CareerEmail>={}):CareerEmail {
  return {
    id,
    provider:'gmail',
    providerMessageId:`gmail:${id}`,
    subject:`Pending action ${id}`,
    snippet:'Please take action.',
    receivedAt:'2026-08-20T12:00:00Z',
    category:'other',
    confidence:.2,
    handled:false,
    attention:'general_action',
    needsAction:true,
    actionReason,
    ...overrides,
  };
}

test('auto-promotes explicit safe email action and keeps ambiguous request for review', async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'munin-email-action-'));
  const inbox=new CareerInboxStore(root);
  await inbox.save({messages:[message('safe','Explicit response requested'),message('review','Information or document requested')]});

  const result=await promoteEmailActions(root);
  assert.equal(result.created,1);
  assert.equal(result.urgent,0);
  assert.equal(result.review,1);
  assert.deepEqual(result.reviewMessageIds,['review']);

  const state=await new ContextStore(root).load();
  assert.equal(state.actions.length,1);
  assert.equal(state.actions[0].priority,'P1');
  assert.match(state.actions[0].title,/Pending action safe/);

  const after=await inbox.load();
  const safe=after.messages.find(x=>x.id==='safe');
  const review=after.messages.find(x=>x.id==='review');
  assert.equal(safe?.handled,true);
  assert.equal(safe?.linkedActionId,state.actions[0].id);
  assert.equal(review?.handled,false);
  assert.equal(review?.linkedActionId,undefined);
});

test('urgent explicit email action is promoted as P0', async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'munin-email-urgent-'));
  const inbox=new CareerInboxStore(root);
  await inbox.save({messages:[message('urgent','Confirmation requested',{subject:'Please confirm by EOD today'})]});
  const result=await promoteEmailActions(root);
  const state=await new ContextStore(root).load();
  assert.equal(result.urgent,1);
  assert.equal(state.actions[0].priority,'P0');
});

test('urgency detector is conservative and deterministic',()=>{
  assert.equal(classifyEmailUrgency({subject:'Please reply today',snippet:''}),'urgent');
  assert.equal(classifyEmailUrgency({subject:'Invoice overdue',snippet:''}),'urgent');
  assert.equal(classifyEmailUrgency({subject:'Please confirm',snippet:'when convenient'}),'normal');
});

test('is idempotent after an email has been promoted', async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'munin-email-action-idempotent-'));
  const inbox=new CareerInboxStore(root);
  await inbox.save({messages:[message('safe','Confirmation requested')]});
  const first=await promoteEmailActions(root);
  const second=await promoteEmailActions(root);
  assert.equal(first.created,1);
  assert.equal(second.created,0);
  assert.equal((await new ContextStore(root).load()).actions.length,1);
});
