import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContentVideoRenderManifest } from '../src/content-video-pipeline.js';

test('builds a zero-cost local-first vertical render manifest',()=>{
 const manifest=buildContentVideoRenderManifest({topic:'Wirecard',script:'Approved script',aspectRatio:'9:16'});
 assert.equal(manifest.version,'money-printer-local-v1');
 assert.deepEqual(manifest.dimensions,{width:1080,height:1920});
 assert.equal(manifest.renderer,'ffmpeg-remotion');
 assert.equal(manifest.policy.paidDependencyRequired,false);
 assert.equal(manifest.policy.automaticInstallAllowed,false);
 assert.equal(manifest.policy.automaticPublishAllowed,false);
 assert.equal(manifest.stages.at(-1)?.id,'review');
});

test('keeps script drafting outside deterministic automation when no script is supplied',()=>{
 const manifest=buildContentVideoRenderManifest({topic:'Drex'});
 assert.equal(manifest.stages[0].id,'script');
 assert.equal(manifest.stages[0].automatic,false);
 assert.equal(manifest.policy.humanApprovalRequired,true);
});

test('rejects empty topics',()=>{
 assert.throws(()=>buildContentVideoRenderManifest({topic:'  '}),/topic is required/);
});
