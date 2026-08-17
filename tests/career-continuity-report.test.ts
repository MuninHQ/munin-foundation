import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCareerContinuityReport } from '../src/career-continuity-report.js';
import type { CareerContinuityMetrics } from '../src/career-continuity-validation.js';

const metrics=(total:number,accuracy:number,meetsTarget:boolean):CareerContinuityMetrics=>({total,correct:Math.round(total*accuracy),needsCorrection:total-Math.round(total*accuracy),accuracy,meetsTarget,target:.8});

test('career continuity report does not overclaim before minimum evidence',()=>{
 const report=buildCareerContinuityReport(metrics(4,1,false));
 assert.equal(report.status,'insufficient_evidence');
 assert.equal(report.killCriterionTriggered,false);
});

test('career continuity report supports the hypothesis at 80 percent or above',()=>{
 const report=buildCareerContinuityReport(metrics(5,.8,true));
 assert.equal(report.status,'supported');
 assert.equal(report.killCriterionTriggered,false);
});

test('career continuity report triggers kill criterion below 80 percent after minimum evidence',()=>{
 const report=buildCareerContinuityReport(metrics(5,.6,false));
 assert.equal(report.status,'at_risk');
 assert.equal(report.killCriterionTriggered,true);
});
