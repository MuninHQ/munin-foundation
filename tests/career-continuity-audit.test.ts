import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCareerContinuity } from '../src/career-continuity-audit.js';
import type { JobOpportunity } from '../src/types.js';
import type { CareerEmail } from '../src/career-inbox.js';

const job=(overrides:Partial<JobOpportunity>={}):JobOpportunity=>({id:'job-1',company:'B3',role:'Product Manager',status:'applied',fitScore:90,nextAction:'Follow up',createdAt:'2026-08-01T00:00:00.000Z',updatedAt:'2026-08-10T00:00:00.000Z',...overrides} as JobOpportunity);
const email=(overrides:Partial<CareerEmail>={}):CareerEmail=>({id:'mail-1',provider:'capture',providerMessageId:'p1',subject:'Interview invitation',snippet:'Schedule an interview',receivedAt:'2026-08-12T00:00:00.000Z',category:'interview_invite',confidence:.95,suggestedStatus:'interview',suggestedAction:'Prepare interview',linkedJobId:'job-1',handled:false,...overrides});

test('career continuity audit passes reconstructed source-anchored pipeline',()=>{
 const report=auditCareerContinuity([job()],[email()]);
 assert.equal(report.healthy,true);
 assert.equal(report.failed,0);
 assert.equal(report.activeJobs,1);
});

test('career continuity audit detects missing next action',()=>{
 const report=auditCareerContinuity([job({nextAction:undefined})],[]);
 assert.equal(report.healthy,false);
 assert.equal(report.findings.some(item=>item.code==='next_action_available'&&!item.ok),true);
});

test('terminal opportunities do not count as active continuity work',()=>{
 const report=auditCareerContinuity([job({status:'rejected'})],[]);
 assert.equal(report.activeJobs,0);
 assert.equal(report.healthy,true);
});
