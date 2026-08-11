import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCareerBrief, buildCareerProcesses } from '../src/career-intelligence.js';
import type { CareerEmail } from '../src/career-inbox.js';
import type { JobOpportunity } from '../src/types.js';
const job:JobOpportunity={id:'job-b3',company:'B3',role:'Analista de Produtos Sênior Digital Assets',status:'applied',fitScore:94,matchedSignals:['digital assets'],followUpAt:'2026-08-10T00:00:00Z',createdAt:'2026-08-01T00:00:00Z',updatedAt:'2026-08-01T00:00:00Z'};
const interview:CareerEmail={id:'mail-1',provider:'gmail',providerMessageId:'gmail:m1',subject:'Entrevista - Analista de Produtos SR (Digital Assets)',snippet:'Vamos conversar amanhã',receivedAt:'2026-08-11T12:00:00Z',category:'interview_invite',confidence:.94,linkedJobId:'job-b3',suggestedStatus:'interview',suggestedAction:'Confirm interview details and prepare war room',handled:false};
test('reconstructs process and marks explicit high-confidence interview as auto',()=>{const p=buildCareerProcesses([job],[interview])[0];assert.equal(p.job.id,'job-b3');assert.equal(p.suggestedStatus,'interview');assert.equal(p.automation,'auto');assert.equal(p.signals.length,1)});
test('career brief prioritizes interview and overdue follow-up',()=>{const b=buildCareerBrief([job],[interview],new Date('2026-08-11T20:00:00Z'));assert.equal(b.counts.interviews,1);assert.equal(b.counts.followUps,1);assert.equal(b.interviews[0].job.company,'B3')});
