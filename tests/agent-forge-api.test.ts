import test from 'node:test';
import assert from 'node:assert/strict';
import { projectAgentForgeEvents } from '../src/agent-forge-api.js';
import type { AgentTelemetryEvent } from '../src/agent-telemetry.js';

const now=Date.parse('2026-08-27T14:00:00.000Z');
const event=(overrides:Partial<AgentTelemetryEvent>):AgentTelemetryEvent=>({name:'agent.started',at:'2026-08-27T13:59:50.000Z',runId:'run-1',agentId:'builder',...overrides});

test('Agent Forge keeps active agents and accumulates evidence',()=>{
 const items=projectAgentForgeEvents([
  event({name:'agent.started'}),
  event({name:'tool.completed',at:'2026-08-27T13:59:55.000Z',evidence:['test'],metadata:{phase:'BUILD',capability:'engineering.build'}}),
  event({name:'tool.completed',at:'2026-08-27T13:59:58.000Z',evidence:['diff'],metadata:{phase:'VERIFY',capability:'engineering.build'}}),
 ],now);
 assert.equal(items.length,1);
 assert.equal(items[0]?.status,'verifying');
 assert.equal(items[0]?.evidenceCount,2);
 assert.equal(items[0]?.capability,'engineering.build');
});

test('Agent Forge retains completed work briefly then expires it',()=>{
 const recent=projectAgentForgeEvents([event({name:'agent.completed',at:'2026-08-27T13:59:45.000Z'})],now);
 const stale=projectAgentForgeEvents([event({name:'agent.completed',at:'2026-08-27T13:59:20.000Z'})],now);
 assert.equal(recent.length,1);
 assert.equal(recent[0]?.status,'completed');
 assert.equal(stale.length,0);
});

test('Agent Forge keeps human blockers visible',()=>{
 const items=projectAgentForgeEvents([event({name:'human.blocked',at:'2026-08-27T01:00:00.000Z'})],now);
 assert.equal(items.length,1);
 assert.equal(items[0]?.status,'blocked');
});
