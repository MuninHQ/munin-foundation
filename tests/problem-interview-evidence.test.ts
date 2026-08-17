import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeProblemInterviews,type ProblemInterviewEvidence } from '../src/problem-interview-evidence.js';
const p=(overrides:Partial<ProblemInterviewEvidence>={}):ProblemInterviewEvidence=>({participantId:Math.random().toString(36),recentContextReconstruction:true,crossToolPain:true,manualWorkaround:true,trustConcern:true,wouldTryContinuityLayer:true,...overrides});

test('requires five real participants',()=>{assert.equal(synthesizeProblemInterviews([p(),p(),p(),p()]).verdict,'insufficient_evidence')});
test('supports repeated behavioral pain with adoption signal',()=>{assert.equal(synthesizeProblemInterviews([p(),p(),p(),p(),p({wouldTryContinuityLayer:false})]).verdict,'supported')});
test('rejects when repeated pain is absent',()=>{assert.equal(synthesizeProblemInterviews([p({recentContextReconstruction:false}),p({recentContextReconstruction:false}),p({recentContextReconstruction:false}),p({recentContextReconstruction:false}),p()]).verdict,'reject')});
test('marks pain without adoption signal ambiguous',()=>{assert.equal(synthesizeProblemInterviews([p({wouldTryContinuityLayer:false}),p({wouldTryContinuityLayer:false}),p({wouldTryContinuityLayer:false}),p(),p()]).verdict,'ambiguous')});
