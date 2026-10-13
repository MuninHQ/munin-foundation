import test from 'node:test';
import assert from 'node:assert/strict';
import { compareMuninReplays } from '../scripts/munin-eval-compare.mjs';

const row=(id,overrides={})=>({caseId:id,inputDigest:'a'.repeat(64),environmentId:'same-host-configuration',claimedCompleted:true,verifiedSuccess:true,humanInterventions:0,securityViolations:0,durationMs:1000,evidenceRefs:['sha256:receipt'],...overrides});
const fixture=(n=10)=>({schemaVersion:1,suite:'munin-career-v1',baseline:{name:'main',runs:Array.from({length:n},(_,i)=>row('case-'+i))},candidate:{name:'feature',runs:Array.from({length:n},(_,i)=>row('case-'+i,{durationMs:800}))}});

test('same verified cases and 20 percent speedup produce only a candidate recommendation',()=>{
 const report=compareMuninReplays(fixture());
 assert.equal(report.verdict,'candidate-improves');
 assert.equal(report.automaticPromotionAllowed,false);
 assert.equal(report.comparison.medianDurationChangeFraction,-0.2);
 assert.equal(report.baseline.medianDurationMs,1000);
});
test('small datasets are insufficient evidence',()=>{
 assert.equal(compareMuninReplays(fixture(5)).verdict,'insufficient-evidence');
});
test('false completion blocks a faster candidate',()=>{
 const data=fixture();data.candidate.runs[0].verifiedSuccess=false;
 const report=compareMuninReplays(data);
 assert.equal(report.verdict,'regression');
 assert.equal(report.candidate.falseCompletions,1);
 assert.equal(report.comparison.verifiedSuccessDelta,-1);
});
test('unsafe actions block even a tiny exploratory dataset',()=>{
 const data=fixture(3);data.candidate.runs[0].securityViolations=1;
 assert.equal(compareMuninReplays(data).verdict,'regression');
});
test('extra interventions block speed gains',()=>{
 const data=fixture();data.candidate.runs[0].humanInterventions=1;
 assert.equal(compareMuninReplays(data).verdict,'regression');
});
test('reported cost growth blocks performance improvements',()=>{
 const data=fixture();
 for(const run of data.baseline.runs)run.costUSD={value:0,provenance:'reported'};
 for(const run of data.candidate.runs)run.costUSD={value:0.01,provenance:'reported'};
 assert.equal(compareMuninReplays(data).verdict,'regression');
});
test('small performance gains are insufficient',()=>{
 const data=fixture();for(const run of data.candidate.runs)run.durationMs=950;
 assert.equal(compareMuninReplays(data).verdict,'no-material-gain');
});
test('unpaired cases, changed input and changed host are rejected',()=>{
 const data=fixture();data.candidate.runs[0].caseId='other';
 assert.throws(()=>compareMuninReplays(data),/missing caseId/);
 const changed=fixture();changed.candidate.runs[0].inputDigest='b'.repeat(64);
 assert.throws(()=>compareMuninReplays(changed),/inputs or environment differ/);
 const host=fixture();host.candidate.runs[0].environmentId='host-other';
 assert.throws(()=>compareMuninReplays(host),/inputs or environment differ/);
});
test('cannot omit verification evidence or invent provenance',()=>{
 const missing=fixture();missing.candidate.runs[0].evidenceRefs=[];
 assert.throws(()=>compareMuninReplays(missing),/invalid run/);
 const telemetry=fixture();telemetry.candidate.runs[0].tokens={input:100,output:20};
 assert.throws(()=>compareMuninReplays(telemetry),/provenance/);
});
test('partial and estimated usage is not mistaken for billed or complete totals',()=>{
 const data=fixture();data.baseline.runs[0].tokens={input:100,output:50,provenance:'reported'};
 data.candidate.runs[0].tokens={input:90,output:45,provenance:'estimated'};
 const report=compareMuninReplays(data);
 assert.equal(report.baseline.telemetry.tokens.reported,1);
 assert.equal(report.baseline.telemetry.tokens.reportedTotal,null);
 assert.equal(report.candidate.telemetry.tokens.estimated,1);
 assert.equal(report.candidate.telemetry.costUSD.unavailable,10);
});
test('duplicates and inconsistent completion flags fail closed',()=>{
 const repeated=fixture();repeated.baseline.runs[1].caseId=repeated.baseline.runs[0].caseId;
 assert.throws(()=>compareMuninReplays(repeated),/duplicate caseId/);
 const inconsistent=fixture();inconsistent.candidate.runs[0].claimedCompleted=false;
 assert.throws(()=>compareMuninReplays(inconsistent),/verifiedSuccess cannot/);
});
