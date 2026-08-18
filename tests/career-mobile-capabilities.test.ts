import assert from 'node:assert/strict';
import test from 'node:test';
import { careerMobileCapabilities } from '../src/career-mobile-capabilities.js';

test('career mobile capabilities expose stable iOS intake contract',async()=>{
 const capabilities=await careerMobileCapabilities();
 assert.equal(capabilities.version,1);
 assert.equal(capabilities.intake.endpoint,'/api/mobile/career/intake');
 assert.equal(capabilities.intake.image.durableStorage,false);
 assert.equal(capabilities.intake.image.transport,'base64-transient');
 assert.equal(capabilities.shortcuts.ios.contract,'munin-career-intake-v1');
 assert.ok(capabilities.shortcuts.ios.acceptedInputs.includes('image'));
});
