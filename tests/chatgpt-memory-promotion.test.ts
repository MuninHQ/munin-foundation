import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContinuityMemoryStore, type MemoryInput } from '../src/continuity-memory.js';
import { MemoryLedger } from '../src/memory-ledger.js';
import { promoteChatGptProjectMemory, reviewChatGptRecordForProject } from '../src/chatgpt-memory-promotion.js';

const base=(patch:Partial<MemoryInput>):MemoryInput=>({kind:'event',subject:'Conversation',content:'Some meaningful historical context',tags:['chatgpt-export'],source:'chatgpt-export:test',confidence:'confirmed',observedAt:'2026-08-18T10:00:00.000Z',lastConfirmedAt:'2026-08-18T10:00:00.000Z',...patch});

test('review gate keeps Munin project context and rejects unrelated personal memory',()=>{
 assert.equal(reviewChatGptRecordForProject(base({kind:'project',content:'Munin Control Room backlog decision'})).accepted,true);
 const personal=reviewChatGptRecordForProject(base({kind:'preference',content:'I like heavy rock and black shirts'}));
 assert.equal(personal.accepted,false);
 assert.ok(personal.reasons.includes('personal-kind-without-project-context'));
});

test('promotion writes only accepted records to continuity memory and ledger',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'munin-chatgpt-promotion-'));
 const continuity=new ContinuityMemoryStore(path.join(root,'continuity.json'));
 const ledger=new MemoryLedger(root);
 const records=[
  base({kind:'decision',subject:'Munin architecture',content:'Decidimos manter o Munin provider-neutral.',tags:['chatgpt-export','munin','decision']}),
  base({kind:'career',subject:'Interview',content:'Interview preparation unrelated to Munin product work',tags:['chatgpt-export','career']}),
 ];
 const result=await promoteChatGptProjectMemory(records,{continuity,ledger});
 assert.equal(result.reviewed,2);
 assert.equal(result.accepted,1);
 assert.equal(result.rejected,1);
 assert.equal(result.continuity.added,1);
 assert.equal(result.ledgerAdded,1);
 const stored=await continuity.list();
 assert.equal(stored.length,1);
 assert.equal(stored[0].subject,'Munin architecture');
 const ledgerEntries=await ledger.list({projectId:'munin'});
 assert.equal(ledgerEntries.length,1);
 assert.equal(ledgerEntries[0].kind,'decision');
 assert.equal(ledgerEntries[0].payload.provenance,'chatgpt-export-reviewed');
});
