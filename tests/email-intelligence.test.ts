import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeEmailIntelligence } from '../src/email-intelligence.js';
import type { CareerEmail } from '../src/career-inbox.js';

function msg(overrides: Partial<CareerEmail>): CareerEmail {
  return {
    id:'m1',provider:'gmail',providerMessageId:'p1',subject:'Subject',snippet:'',receivedAt:'2026-08-20T12:00:00Z',category:'other',confidence:.8,handled:false,attention:'reference',needsAction:false,
    ...overrides,
  };
}

test('email intelligence prioritizes career and general actions', () => {
  const snapshot=summarizeEmailIntelligence([
    msg({id:'career',providerMessageId:'c',subject:'Interview',attention:'career',needsAction:true,linkedJobId:'job-1'}),
    msg({id:'general',providerMessageId:'g',subject:'Please approve',attention:'general_action',needsAction:true,actionReason:'Approval or signature requested'}),
    msg({id:'ref',providerMessageId:'r',attention:'reference'}),
    msg({id:'noise',providerMessageId:'n',attention:'noise',handled:true}),
  ],'2026-08-20T12:30:00Z',new Date('2026-08-20T13:00:00Z'));
  assert.equal(snapshot.unreadActionable,2);
  assert.equal(snapshot.careerActionable,1);
  assert.equal(snapshot.generalActionable,1);
  assert.equal(snapshot.reviewRequired,1);
  assert.equal(snapshot.reference,1);
  assert.equal(snapshot.noise,1);
  assert.deepEqual(snapshot.topActions.map(x=>x.id),['career','general']);
});

test('handled messages never surface as open actions', () => {
  const snapshot=summarizeEmailIntelligence([msg({handled:true,attention:'general_action',needsAction:true})]);
  assert.equal(snapshot.unreadActionable,0);
  assert.equal(snapshot.topActions.length,0);
});
