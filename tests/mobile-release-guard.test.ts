import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

function executeGuard(){
  const listeners=new Map<string,()=>void>();
  const timers:Array<()=>void>=[];
  const classes=new Set<string>();
  let connected=true;
  const enter={textContent:'',addEventListener:(name:string,callback:()=>void)=>listeners.set(name,callback)};
  const splash={get isConnected(){return connected},classList:{add:(name:string)=>classes.add(name)},querySelector:()=>enter,remove:()=>{connected=false}};
  const head={appendChild:()=>undefined};
  const document={getElementById:()=>splash,createElement:()=>({textContent:''}),head};
  const window={setTimeout:(callback:()=>void)=>{timers.push(callback);return timers.length}};
  return readFile(new URL('../../apps/web/public/mobile-release-guard.js',import.meta.url),'utf8').then(source=>{
    vm.runInNewContext(source,{document,window,setTimeout:window.setTimeout});
    return{enter,listeners,timers,classes,isConnected:()=>connected};
  });
}

test('visible mobile entry button dismisses the splash',async()=>{
  const state=await executeGuard();
  assert.equal(state.enter.textContent,'ENTRAR NO MUNIN');
  state.listeners.get('click')?.();
  assert.ok(state.classes.has('leaving'));
  state.timers.at(-1)?.();
  assert.equal(state.isConnected(),false);
});

test('mobile splash dismisses itself when the user does nothing',async()=>{
  const state=await executeGuard();
  state.timers[0]?.();
  assert.ok(state.classes.has('leaving'));
  state.timers.at(-1)?.();
  assert.equal(state.isConnected(),false);
});
