import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCareerContinuityMetrics, type CareerContinuityFeedback } from '../src/career-continuity-validation.js';
const item=(verdict:'correct'|'needs_correction',index:number):CareerContinuityFeedback=>({id:String(index),verdict,createdAt:new Date(2026,0,index+1).toISOString()});
test('career continuity target requires minimum sample and 80 percent accuracy',()=>{
 const empty=computeCareerContinuityMetrics([]);assert.equal(empty.accuracy,0);assert.equal(empty.meetsTarget,false);
 const small=computeCareerContinuityMetrics([item('correct',0),item('correct',1),item('correct',2),item('correct',3)]);assert.equal(small.accuracy,1);assert.equal(small.meetsTarget,false);
 const passing=computeCareerContinuityMetrics([item('correct',0),item('correct',1),item('correct',2),item('correct',3),item('needs_correction',4)]);assert.equal(passing.accuracy,.8);assert.equal(passing.meetsTarget,true);
 const failing=computeCareerContinuityMetrics([item('correct',0),item('correct',1),item('correct',2),item('needs_correction',3),item('needs_correction',4)]);assert.equal(failing.accuracy,.6);assert.equal(failing.meetsTarget,false);
});