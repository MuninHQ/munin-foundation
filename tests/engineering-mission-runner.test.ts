import test from 'node:test';
import assert from 'node:assert/strict';
import { runEngineeringMission } from '../src/engineering-mission-runner.js';
import type { EngineeringMissionRuntime } from '../src/engineering-autonomous-mission.js';

const completed:EngineeringMissionRuntime={execute:async objective=>({status:'completed',objective,branch:'agent/test',commit:'abc',changedFiles:['src/x.ts'],events:[],validation:'npm test passed',delivery:'local-commit',message:'done'})};

test('mission runner preserves EngineeringResult contract and appends bounded loop evidence',async()=>{
 const result=await runEngineeringMission('build local feature',process.cwd(),completed);
 assert.equal(result.status,'completed');
 assert.equal(result.objective,'build local feature');
 assert.equal(result.commit,'abc');
 const loop=result.events.at(-1);
 assert.equal(loop?.phase,'completed');
 assert.match(loop?.message??'',/loop finished with DONE/);
 assert.match(loop?.evidence??'',/1:PLAN:PASS/);
 assert.match(loop?.evidence??'',/1:VERIFY:PASS/);
});

test('mission runner maps policy blocker to existing needs_user contract without invoking runtime',async()=>{
 let calls=0;const runtime:EngineeringMissionRuntime={execute:async objective=>{calls++;return {...await completed.execute(objective)}}};
 const result=await runEngineeringMission('deploy to production',process.cwd(),runtime);
 assert.equal(calls,0);
 assert.equal(result.status,'needs_user');
 assert.match(result.message,/Action Constitution needs_user/);
});

test('mission runner keeps final failed engineering evidence after bounded repeated failure',async()=>{
 let calls=0;const runtime:EngineeringMissionRuntime={execute:async objective=>{calls++;return {status:'failed',objective,changedFiles:[],events:[],validation:'npm test failed',message:'same failure'}}};
 const result=await runEngineeringMission('fix local failure',process.cwd(),runtime);
 assert.equal(calls,2);
 assert.equal(result.status,'failed');
 assert.match(result.events.at(-1)?.message??'',/loop finished with FAILED/);
});
