import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActionInbox } from '../src/action-inbox.js';
import type { MuninState } from '../src/types.js';
import type { TrustedSourceSnapshot } from '../src/trusted-source-radar.js';

const empty=():MuninState=>({projects:[],decisions:[],actions:[],jobs:[],research:[],goals:[],relations:[]});
test('Action Inbox merges workspace, email and radar into explicit lanes',()=>{
 const state=empty();state.actions.push({id:'a1',title:'Responder recrutador',priority:'P0',status:'planned',createdAt:'2026-08-22T10:00:00Z',updatedAt:'2026-08-22T10:00:00Z'});
 const email={messages:[{id:'m1',provider:'gmail' as const,providerMessageId:'1',subject:'Interview invitation',snippet:'',receivedAt:'2026-08-22T12:00:00Z',category:'interview_invite' as const,confidence:.9,handled:false,attention:'career' as const,needsAction:true}]};
 const radar={signals:[{id:'s1',sourceId:'bcb' as const,sourceName:'BCB',title:'Nova consulta sobre ativos digitais',url:'https://example.test',relevance:80,themes:['Digital Assets'],fetchedAt:'2026-08-22T11:00:00Z',dateVerified:true,freshnessDays:0}],sources:[],status:[],fetchedAt:'2026-08-22T11:00:00Z',expiresAt:'2026-08-22T12:00:00Z'} satisfies TrustedSourceSnapshot;
 const result=buildActionInbox(state,email,radar,new Date('2026-08-22T13:00:00Z'));
 assert.equal(result.counts.now,2);assert.equal(result.counts.radar,1);assert.equal(result.items[0].priority,'P0');
 assert.ok(result.items.every(item=>item.whyItMatters&&item.recommendation&&item.impact));
 assert.match(result.items.find(item=>item.origin==='radar')?.recommendation??'',/fonte/i);
});

test('handled email never returns to the operator queue',()=>{
 const result=buildActionInbox(empty(),{messages:[{id:'m1',provider:'capture',providerMessageId:'1',subject:'Done',snippet:'',receivedAt:'2026-08-22T12:00:00Z',category:'other',confidence:.5,handled:true,attention:'general_action',needsAction:true}]});
 assert.equal(result.items.length,0);
});


test('pending Sentinel approvals surface as P0 review items',()=>{
 const decision={band:'RED' as const,disposition:'needs_approval' as const,rule:'external-write-escalation',request:{class:'external-write' as const,tool:'send email',target:'recruiter'},policy:{decision:'needs_user' as const,rule:'external-write-escalation',request:{class:'external-write' as const,tool:'send email',target:'recruiter'}}};
 const approvals=[{id:'approval-1',createdAt:'2026-09-10T03:00:00.000Z',updatedAt:'2026-09-10T03:00:00.000Z',status:'pending' as const,decision}];
 const result=buildActionInbox(empty(),{messages:[]},undefined,new Date('2026-09-10T03:01:00.000Z'),[],approvals);
 const item=result.items.find(entry=>entry.origin==='approval');
 assert.equal(item?.lane,'review');
 assert.equal(item?.priority,'P0');
 assert.match(item?.whyItMatters??'',/Sentinel/i);
});
