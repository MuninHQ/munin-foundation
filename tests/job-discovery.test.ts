import assert from 'node:assert/strict';
import test from 'node:test';
import { extractJobDiscoveries } from '../src/job-discovery.js';
import type { CareerEmail } from '../src/career-inbox.js';
import type { JobOpportunity } from '../src/types.js';
const alert:CareerEmail={id:'a1',provider:'gmail',providerMessageId:'1',subject:'Job alert: Product Manager - Digital Assets',snippet:'Fintech role focused on payments, blockchain and product strategy',receivedAt:'2026-08-11T10:00:00Z',category:'job_alert',confidence:.86,handled:true};
test('scores relevant job alerts for discovery',()=>{const [d]=extractJobDiscoveries([alert],[]);assert.ok(d.score>=70);assert.ok(d.signals.includes('digital assets'));assert.equal(d.duplicateJobId,undefined)});

const job: JobOpportunity = {id:'job-a',company:'Bank A',role:'Product Manager',status:'discovered',fitScore:80,matchedSignals:[],createdAt:'2026-08-01T00:00:00Z',updatedAt:'2026-08-01T00:00:00Z'};
test('same title at another company is not a duplicate',()=>{
 const [d]=extractJobDiscoveries([{...alert,detectedCompany:'Bank B',detectedRole:'Product Manager'}],[job]);
 assert.equal(d.duplicateJobId,undefined);
});
test('short role and company cannot create an empty-token duplicate',()=>{
 const [d]=extractJobDiscoveries([alert],[{...job,company:'B3',role:'VP'}]);
 assert.equal(d.duplicateJobId,undefined);
});
test('extracts safe application links and groups repeated alerts by latest evidence',()=>{
 const messages=[{...alert,id:'old',detectedCompany:'Bank A',detectedRole:'Product Manager',snippet:'Apply https://www.linkedin.com/jobs/view/123/?trackingId=old'}, {...alert,id:'new',detectedCompany:'Bank A',detectedRole:'Product Manager',snippet:'Apply https://www.linkedin.com/jobs/view/123/?trackingId=new',receivedAt:'2026-08-12T10:00:00Z'}];
 const items=extractJobDiscoveries(messages,[]);
 assert.equal(items.length,1);assert.equal(items[0].sourceMessageId,'new');
 assert.equal(items[0].link,'https://www.linkedin.com/jobs/view/123/');
 assert.equal(items[0].availability,'unverified');
});
test('new alert for a closed process is surfaced for revalidation',()=>{
 const [d]=extractJobDiscoveries([{...alert,detectedCompany:'Bank A',detectedRole:'Product Manager'}],[{...job,status:'closed'}]);
 assert.equal(d.resurfaced,true);assert.equal(d.duplicateStatus,'closed');
});

test('different LinkedIn job ids do not collapse into the same submitted process',()=>{
 const [d]=extractJobDiscoveries([{...alert,detectedCompany:'Bank A',detectedRole:'Product Manager',snippet:'https://www.linkedin.com/jobs/view/456/'}],[{...job,status:'applied',link:'https://www.linkedin.com/jobs/view/123/'}]);
 assert.equal(d.duplicateJobId,undefined);
});
