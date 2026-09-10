import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionAuditLog } from '../src/action-constitution.js';
import { ApprovalQueue } from '../src/sentinel.js';
import { AgentRuntimeV1 } from '../src/agent-runtime-v1.js';
import { prepareCareerApplicationWithRuntime, planCareerSubmission } from '../src/career-agent-runtime.js';
import { planVideoPublication } from '../src/content-video-agent-runtime.js';
import type { MuninState, JobOpportunity } from '../src/types.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const empty=():MuninState=>({projects:[],decisions:[],actions:[],jobs:[],research:[],goals:[],relations:[]});
const job:JobOpportunity={id:'job-1',company:'ExamplePay',role:'Senior Product Manager, Payments',description:'Own payments product strategy and stakeholder management',status:'discovered',fitScore:87,matchedSignals:['payments','product strategy'],createdAt:'2026-09-10T03:00:00Z',updatedAt:'2026-09-10T03:00:00Z'};

async function fixture(){const dir=await mkdtemp(path.join(tmpdir(),'munin-runtime-adoption-'));const runtime=new AgentRuntimeV1(new ActionAuditLog(path.join(dir,'audit.jsonl')),new ApprovalQueue(path.join(dir,'approvals.json')));return{dir,runtime};}

test('Career worker prepares packet under AMBER and detects 80 percent threshold',async()=>{const {dir,runtime}=await fixture();try{const result=await prepareCareerApplicationWithRuntime(empty(),job,{}, {runtime,previousFitScore:79,now:new Date('2026-09-10T04:00:00Z')});assert.equal(result.packet.decision,'CANDIDATAR');assert.equal(result.runtime.sentinel.band,'AMBER');assert.equal(result.runtime.sentinel.disposition,'guarded_execute');assert.equal(result.watcher?.triggered,true);}finally{await rm(dir,{recursive:true,force:true});}});

test('Career submission is RED and queued for approval',async()=>{const {dir,runtime}=await fixture();try{const result=await planCareerSubmission(empty(),job,{runtime,now:new Date('2026-09-10T04:00:00Z')});assert.equal(result.sentinel.band,'RED');assert.equal(result.sentinel.disposition,'needs_approval');assert.ok(result.approvalId);}finally{await rm(dir,{recursive:true,force:true});}});

test('Video publication is RED and cannot bypass approval',async()=>{const {dir,runtime}=await fixture();try{const result=await planVideoPublication(empty(),'youtube','Wirecard documentary draft',{runtime,now:new Date('2026-09-10T04:00:00Z')});assert.equal(result.sentinel.band,'RED');assert.equal(result.sentinel.disposition,'needs_approval');assert.ok(result.approvalId);}finally{await rm(dir,{recursive:true,force:true});}});
