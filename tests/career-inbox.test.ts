import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CareerInboxStore, classifyCareerEmail, type CareerEmail } from '../src/career-inbox.js';
import type { JobOpportunity } from '../src/types.js';

const job: JobOpportunity = { id:'job-b3',company:'B3',role:'Analista de Produtos Sênior Digital Assets',status:'applied',fitScore:94,matchedSignals:['digital assets'],createdAt:'2026-08-01T00:00:00Z',updatedAt:'2026-08-01T00:00:00Z' };

test('classifies interview invitation and links known job', () => {
  const result=classifyCareerEmail({subject:'B3 - convite para entrevista',snippet:'Gostaríamos de agendar uma conversa sobre Digital Assets',fromEmail:'recrutamento@b3.com.br'},[job]);
  assert.equal(result.category,'interview_invite'); assert.equal(result.suggestedStatus,'interview'); assert.equal(result.linkedJobId,'job-b3'); assert.ok(result.confidence>0.9);
});

test('deduplicates provider message ids', async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'munin-inbox-')); const store=new CareerInboxStore(root);
  const message:CareerEmail={id:'1',provider:'gmail',providerMessageId:'m1',subject:'Application received',snippet:'Thank you for applying',receivedAt:new Date().toISOString(),category:'application_confirmation',confidence:.86,handled:false};
  const first=await store.upsert([message]); const second=await store.upsert([{...message,id:'2'}]);
  assert.equal(first.added,1); assert.equal(second.duplicates,1); assert.equal((await store.load()).messages.length,1);
});
