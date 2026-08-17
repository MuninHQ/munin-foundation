import test from 'node:test';
import assert from 'node:assert/strict';
import { combineCareerContinuityEvidence } from '../src/career-continuity-evidence.js';
import type { CareerContinuityReport } from '../src/career-continuity-report.js';
import type { CareerContinuityAuditReport } from '../src/career-continuity-audit.js';

function empirical(total:number,correct:number):CareerContinuityReport{
 const accuracy=total?correct/total:0;const meetsTarget=total>=5&&accuracy>=.8;
 return{status:total<5?'insufficient_evidence':meetsTarget?'supported':'at_risk',metrics:{total,correct,needsCorrection:total-correct,accuracy,meetsTarget,target:.8},summary:'test',killCriterionTriggered:total>=5&&!meetsTarget,next:'test'};
}
function structural(healthy=true):CareerContinuityAuditReport{return{generatedAt:new Date(0).toISOString(),activeJobs:2,findings:[],passed:healthy?4:3,failed:healthy?0:1,healthy};}

test('requires real empirical evidence even with healthy structure',()=>{
 const report=combineCareerContinuityEvidence(empirical(3,3),structural());
 assert.equal(report.status,'insufficient_evidence');
 assert.equal(report.readyToConclude,false);
 assert.match(report.blockers[0],/2 more real continuity feedback checks required/);
});

test('supports hypothesis only when structure and empirical target both pass',()=>{
 const report=combineCareerContinuityEvidence(empirical(5,4),structural());
 assert.equal(report.status,'supported');
 assert.equal(report.readyToConclude,true);
 assert.equal(report.blockers.length,0);
});

test('structural failure takes precedence over empirical success',()=>{
 const report=combineCareerContinuityEvidence(empirical(5,5),structural(false));
 assert.equal(report.status,'structural_failure');
 assert.equal(report.readyToConclude,false);
});
