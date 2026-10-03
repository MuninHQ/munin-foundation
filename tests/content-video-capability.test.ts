import test from 'node:test';
import assert from 'node:assert/strict';
import { createContentVideoCapability } from '../src/content-video-capability.js';

const context={capability:'media.content-video',executionId:'test',startedAt:new Date().toISOString(),input:{action:'plan'},metadata:{}};

test('content video plans governed local render work without installing or publishing',async()=>{
 const capability=createContentVideoCapability();
 const output=await capability.execute({action:'plan',topic:'O caminho invisível de um Pix',script:'Approved script',aspectRatio:'9:16'},context);
 assert.equal(output.action,'plan');
 assert.equal(output.policy.automaticInstallAllowed,false);
 assert.equal(output.policy.automaticPublishAllowed,false);
 assert.equal(output.policy.humanApprovalRequired,true);
 assert.equal(output.policy.defaultProvider,'local-render');
 assert.equal(output.request?.provider,'local-render');
 assert.deepEqual(output.request?.brandRules,{noLogo:true,noMonogram:true,noSignature:true,noWatermark:true});
 const pipeline=output.request?.pipeline as {version?:string;renderer?:string;policy?:{paidDependencyRequired?:boolean}};
 assert.equal(pipeline.version,'money-printer-local-v1');
 assert.equal(pipeline.renderer,'ffmpeg-remotion');
 assert.equal(pipeline.policy?.paidDependencyRequired,false);
});

test('content video generation fails closed while disabled',async()=>{
 const old=process.env.MUNIN_CONTENT_VIDEO_ENABLED;
 delete process.env.MUNIN_CONTENT_VIDEO_ENABLED;
 try{
  await assert.rejects(createContentVideoCapability().execute({action:'generate',topic:'test'},context),/disabled/);
 }finally{
  old===undefined?delete process.env.MUNIN_CONTENT_VIDEO_ENABLED:process.env.MUNIN_CONTENT_VIDEO_ENABLED=old;
 }
});
