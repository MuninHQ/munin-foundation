import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function presence() {
  const events=new EventTarget(), timers:Array<()=>void>=[], document={documentElement:{dataset:{} as Record<string,string>}};
  const context=vm.createContext({window:events,document,CustomEvent,setTimeout:(fn:()=>void)=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}});
  vm.runInContext(readFileSync('apps/web/public/munin-presence.js','utf8'),context);
  const emit=(id:string,state:string)=>events.dispatchEvent(new CustomEvent('munin:state',{detail:{id,state}}));
  const snapshot=()=>JSON.parse(JSON.stringify((events as any).MuninPresence.snapshot()));
  return {emit,snapshot,document,timers,events};
}
test('presence retains pending work when a parallel request finishes',()=>{
 const p=presence();p.emit('read','thinking');p.emit('write','executing');p.emit('read','done');
 assert.deepEqual(p.snapshot(),{state:'executing',label:'Executando solicitação',pending:1});
 p.emit('write','done');assert.equal(p.snapshot().state,'done');assert.equal(p.snapshot().pending,0);
 p.timers.at(-1)!();assert.equal(p.snapshot().state,'idle');
});
test('a parallel success cannot obscure an API failure',()=>{
 const p=presence();p.emit('a','thinking');p.emit('b','searching');p.emit('a','warning');p.emit('b','done');
 assert.equal(p.snapshot().state,'warning');assert.equal(p.document.documentElement.dataset.muninState,'warning');
 p.emit('retry','thinking');assert.equal(p.snapshot().state,'thinking');p.emit('retry','done');assert.equal(p.snapshot().state,'done');
});
test('browser client emits terminal failure for network errors and keeps the original error',async()=>{
 const p=presence(), failure=new Error('network unavailable');
 const context=vm.createContext({window:p.events,document:p.document,CustomEvent,Headers,FormData,crypto,location:{pathname:'/test.html'},fetch:async()=>{throw failure;}});
 vm.runInContext(readFileSync('apps/web/public/munin-client.js','utf8'),context);
 await assert.rejects((p.events as any).Munin.request('/api/workspace'),/network unavailable/);
 assert.equal(p.snapshot().state,'warning');assert.equal(p.snapshot().pending,0);
});
test('constellation excludes sensitive values and only connects records to their real source',()=>{
 const window:any={},context=vm.createContext({window,document:{getElementById:()=>null}});
 vm.runInContext(readFileSync('apps/web/public/memory-constellation.js','utf8'),context);
 const graph=JSON.parse(JSON.stringify(window.MuninMemoryGraph.createGraph({state:{sections:{profile:{key:'Perfil',scope:'public-professional',value:{name:'Demo'}},secret:{key:'Privado',scope:'sensitive-private',value:{password:'never show'}},project:{key:'Projeto',scope:'private-operational',value:{next:'Review'}}}}},{controlRoom:{timeline:[{id:'t1',title:'Demo decision',summary:'Approved',at:'2026-10-08'}]}})));
 assert.equal(graph.hiddenSensitive,1);assert.equal(graph.nodes.length,5);assert.equal(graph.edges.length,3);
 assert.ok(!JSON.stringify(graph).includes('never show'));
 assert.ok(graph.edges.every((edge:any)=>['contexts','timeline'].includes(edge.from)));
 assert.equal(graph.nodes.find((node:any)=>node.id==='context-Perfil').summary,'{\n  "name": "Demo"\n}');
});
