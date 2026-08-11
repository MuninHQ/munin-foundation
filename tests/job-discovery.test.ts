import assert from 'node:assert/strict';
import test from 'node:test';
import { extractJobDiscoveries } from '../src/job-discovery.js';
import type { CareerEmail } from '../src/career-inbox.js';
const alert:CareerEmail={id:'a1',provider:'gmail',providerMessageId:'1',subject:'Job alert: Product Manager - Digital Assets',snippet:'Fintech role focused on payments, blockchain and product strategy',receivedAt:'2026-08-11T10:00:00Z',category:'job_alert',confidence:.86,handled:true};
test('scores relevant job alerts for discovery',()=>{const [d]=extractJobDiscoveries([alert],[]);assert.ok(d.score>=70);assert.ok(d.signals.includes('digital assets'));assert.equal(d.duplicateJobId,undefined)});
