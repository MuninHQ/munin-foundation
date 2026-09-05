import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

async function surface(fail = '', hang = false) {
  const nodes = new Map<string, any>();
  const calls: string[] = [];
  const data: Record<string, any> = {
    '/api/action-inbox': { items: [
      { id:'done', title:'Already done', lane:'done', priority:'P0' },
      { id:'review', title:'<img src=x onerror=alert(1)>', lane:'review', priority:'P1', recommendation:'Review this', href:'javascript:alert(1)' },
      { id:'urgent', title:'Urgent', lane:'now', priority:'P0', recommendation:'Call owner', href:'/action-inbox.html' },
    ] },
    '/api/second-brain/daily': { executive:{ blocked:[{ objective:'Blocked task', status:'blocked', phase:'VERIFY', blocker:'Needs review' }], active:[], recentlyCompleted:[] } },
    '/api/orchestrate/status': { severity:'attention', engineering:{active:2,needsUser:1,failed:0}, controlRoom:{ready:true}, email:{workerStatus:'healthy'}, attention:['Review required'] },
  };
  const get = (id: string) => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML:'',textContent:'',disabled:false,addEventListener(){} });
    return nodes.get(id);
  };
  const window: any = { Munin:{
    escapeHtml:(s:unknown) => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
    request:async (path:string, options?: {signal:AbortSignal}) => {
      calls.push(path);
      if(path===fail && hang) return new Promise((_,reject) => options?.signal.addEventListener('abort',()=>reject(Error('timeout'))));
      if(path===fail) throw Error('offline');return data[path];
    },
  } };
  // Native AbortSignal.timeout uses an unreferenced timer in Node. Keep the
  // simulated browser deadline alive even when this is the last pending test.
  const deadline = () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(),5);
    return controller.signal;
  };
  runInNewContext(await readFile('apps/web/public/munin-core.js','utf8'), {window,document:{getElementById:get},Date,URL,AbortSignal:{timeout:deadline}});
  await new Promise(resolve => setTimeout(resolve,20));
  await window.muninCore.refresh();
  return {get,calls,data,window};
}

test('core prioritizes open actions, preserves governed links and escapes untrusted text', async () => {
  const {get,calls} = await surface();
  const html = get('corePriorities').innerHTML;
  assert.ok(html.indexOf('Urgent') < html.indexOf('&lt;img'));
  assert.doesNotMatch(html,/Already done|javascript:|<img/);
  assert.match(html,/Call owner/);
  assert.ok(calls.every(path=>path.startsWith('/api/')));
  assert.match(get('coreCheckpoints').innerHTML,/Blocked task/);
  assert.match(get('coreRuntime').innerHTML,/2/);
});

test('slow source times out and unlocks refresh while other panels remain usable', async () => {
  const {get} = await surface('/api/orchestrate/status',true);
  assert.equal(get('coreRefresh').disabled,false);
  assert.match(get('coreRuntime').innerHTML,/indisponível/i);
  assert.match(get('corePriorities').innerHTML,/Urgent/);
});

test('one unavailable source does not hide healthy panels or claim empty state', async () => {
  const {get} = await surface('/api/second-brain/daily');
  assert.match(get('coreCheckpoints').innerHTML,/indisponível/i);
  assert.match(get('corePriorities').innerHTML,/Urgent/);
  assert.match(get('coreRuntime').innerHTML,/2/);
  assert.match(get('coreFreshness').textContent,/parcial/i);
});

test('refresh replaces old data with explicit empty states', async () => {
  const {get,data,window} = await surface();
  data['/api/action-inbox'] = {items:[]};
  data['/api/second-brain/daily'] = {executive:{blocked:[],active:[],recentlyCompleted:[]}};
  await window.muninCore.refresh();
  assert.doesNotMatch(get('corePriorities').innerHTML,/Urgent/);
  assert.match(get('corePriorities').innerHTML,/Nenhuma/);
  assert.match(get('coreCheckpoints').innerHTML,/Nenhum/);
});
