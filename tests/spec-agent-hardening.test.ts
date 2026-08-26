import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSpecConvergence } from '../src/spec-convergence.js';
import { ScriptedProvider, ScriptedTool, ScriptedHumanApproval } from '../src/agent-test-fixtures.js';
import { preToolGuard, postToolGuard, executeWithTripwires } from '../src/tool-tripwire.js';
import { buildMissionContextPacket } from '../src/mission-context-packet.js';
import { summarizeAgenticRiskCoverage } from '../src/agentic-risk-coverage.js';
import { createAgentTraceEnvelope } from '../src/agent-trace-envelope.js';

test('spec convergence requires requirement evidence and rejects unscoped implementation',()=>{const spec={objective:'ship',requirements:[{id:'R1',text:'works',acceptanceCriteria:['test']}]};assert.equal(evaluateSpecConvergence(spec,[{requirementId:'R1',evidence:['test:pass']}],['R1']).pass,true);const bad=evaluateSpecConvergence(spec,[],['UNKNOWN']);assert.equal(bad.pass,false);assert.deepEqual(bad.orphanRequirements,['R1']);assert.deepEqual(bad.unscopedImplementation,['UNKNOWN'])});
test('scripted agent fixtures are deterministic',async()=>{const provider=new ScriptedProvider([{match:'build',result:'ok'}]);assert.equal(await provider.run('build now'),'ok');const tool=new ScriptedTool('done');assert.equal(await tool.run('x'),'done');assert.deepEqual(tool.calls,['x']);const approval=new ScriptedHumanApproval(false);assert.equal(await approval.request('publish'),false)});
test('tool tripwires fail closed on consequential/cost/secret and missing evidence',async()=>{assert.equal(preToolGuard({tool:'mail',risk:'consequential'}).allow,false);assert.equal(preToolGuard({tool:'api',risk:'read',costUsd:1}).allow,false);assert.equal(postToolGuard({evidence:['verified']}).allow,true);await assert.rejects(()=>executeWithTripwires({tool:'x',risk:'read'},async()=>({output:'ok'})),/postflight blocked/i)});
test('mission context packet is bounded',()=>{const p=buildMissionContextPacket({objective:'x',constraints:['1','2','3'],maxItemsPerSection:2});assert.deepEqual(p.constraints,['1','2']);assert.equal(p.truncated,true)});
test('agentic risk coverage exposes uncovered and failed classes',()=>{const report=summarizeAgenticRiskCoverage([{id:'a',risks:['behavior-hijacking','tool-misuse'],passed:false}]);assert.equal(report.coveredRisks,2);assert.ok(report.failedRisks.includes('behavior-hijacking'));assert.ok(report.uncoveredRisks.length>0)});
test('trace envelope emits OTel-compatible ids and gen ai attributes',()=>{const e=createAgentTraceEnvelope({agent:'reviewer',tool:'git',provider:'local',durationMs:12});assert.equal(e.trace_id.length,32);assert.equal(e.span_id.length,16);assert.equal(e.attributes['gen_ai.agent.name'],'reviewer');assert.equal(e.attributes['gen_ai.tool.name'],'git')});
