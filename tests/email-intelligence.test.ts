import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeEmailIntelligence } from '../src/email-intelligence.js';
import { scoreEmailInterest } from '../src/email-interest.js';
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

test('reference emails are ranked only when professional relevance clears threshold', () => {
  const snapshot=summarizeEmailIntelligence([
    msg({id:'relevant',providerMessageId:'r1',subject:'Banco Central update on stablecoins and digital assets'}),
    msg({id:'generic',providerMessageId:'r2',subject:'Weekly office update'}),
    msg({id:'promo',providerMessageId:'r3',subject:'Promotion coupon',snippet:'unsubscribe'}),
  ]);
  assert.equal(snapshot.interestingReads,1);
  assert.equal(snapshot.topReads[0].id,'relevant');
  assert.ok(snapshot.topReads[0].score>=3);
  assert.match(snapshot.topReads[0].reasons.join(' '),/digital assets|regulation/i);
});

test('interest scorer is deterministic and suppresses promotional signals', () => {
  assert.ok(scoreEmailInterest({subject:'Open Finance regulation report',snippet:''}).score>=3);
  assert.equal(scoreEmailInterest({subject:'Promotion',snippet:'unsubscribe now'}).score,0);
});

test('handled messages never surface as open actions or reads', () => {
  const snapshot=summarizeEmailIntelligence([msg({handled:true,attention:'reference',subject:'Stablecoin report'})]);
  assert.equal(snapshot.unreadActionable,0);
  assert.equal(snapshot.topActions.length,0);
  assert.equal(snapshot.topReads.length,0);
});
