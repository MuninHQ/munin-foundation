import test from 'node:test';import assert from 'node:assert/strict';import {buildCareerRavenSnapshot} from '../src/career-raven.js';import type {CareerEmail} from '../src/career-inbox.js';
const msg=(id:string,subject:string,snippet:string,company?:string,role?:string,category:any='job_alert'):CareerEmail=>({id,provider:'gmail',providerMessageId:id,subject,snippet,receivedAt:'2026-08-27T12:00:00Z',category,confidence:.95,handled:false,detectedCompany:company,detectedRole:role});
test('career raven promotes strategic senior fintech roles and downranks weak fit',()=>{const snapshot=buildCareerRavenSnapshot([msg('1','Product Strategy Manager na empresa Example Fintech','payments stablecoin digital assets product strategy','Example Fintech','Product Strategy Manager'),msg('2','KYC Operations Analyst na empresa Example Bank','kyc operations analyst','Example Bank','KYC Operations Analyst')],[]);assert.equal(snapshot.recommendations[0]?.decision,'APPLY_NOW');assert.ok(snapshot.recommendations[0]!.score>snapshot.recommendations[1]!.score)});
test('career raven exposes confirmed applications',()=>{const snapshot=buildCareerRavenSnapshot([msg('a','Thank you for your application to Yuno','received application','Yuno','Partnerships Manager','application_confirmation')],[]);assert.equal(snapshot.applied.length,1);assert.equal(snapshot.applied[0]?.company,'Yuno')});

test('a discovered job is not mislabeled as an application and a closed job can resurface',()=>{
 const job={id:'job-1',company:'Example Fintech',role:'Product Strategy Manager',status:'discovered' as const,fitScore:90,matchedSignals:[],createdAt:'2026-08-01T00:00:00Z',updatedAt:'2026-08-01T00:00:00Z'};
 const messages=[msg('1','Product Strategy Manager na empresa Example Fintech','payments product strategy','Example Fintech','Product Strategy Manager')];
 assert.notEqual(buildCareerRavenSnapshot(messages,[job]).recommendations[0].decision,'ALREADY_APPLIED');
 assert.equal(buildCareerRavenSnapshot(messages,[{...job,status:'applied'}]).recommendations[0].decision,'ALREADY_APPLIED');
 const resurfaced=buildCareerRavenSnapshot(messages,[{...job,status:'closed'}]).recommendations[0];
 assert.equal(resurfaced.decision,'REVIEW');assert.equal(resurfaced.resurfaced,true);
});
