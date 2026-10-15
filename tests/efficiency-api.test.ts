import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handleEfficiencyApi } from '../src/efficiency-api.js';

async function request(method:string,url:string,body?:unknown){const server=createServer((req,res)=>void handleEfficiencyApi(req,res));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('missing address');try{const response=await fetch(`http://127.0.0.1:${address.port}${url}`,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json() as Record<string,unknown>}}finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}}

test('manual packet endpoint prepares but never sends or ingests a response', async () => {
  const response = await request('POST', '/api/efficiency/manual-web-packet', { objective: 'review diff' });
  assert.equal(response.status, 201);
  assert.equal(response.body.boundary, 'manual-only-no-response-ingestion');
  assert.equal('response' in response.body, false);
});
test('unknown efficiency route returns 404', async () => { const response = await request('POST', '/api/efficiency/response', { text: 'external answer' }); assert.equal(response.status, 404); });
