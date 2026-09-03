import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest, type RequestOptions } from 'node:http';
import { createCareerContinuityFeedbackHandler } from '../src/career-continuity-feedback-api.js';
import type { CareerContinuityFeedback, CareerContinuityFeedbackInput } from '../src/career-continuity-validation.js';

const token='test-career-continuity-token';
type ApiResponse={status:number;headers:Record<string,string|string[]|undefined>;text:string};

async function withApi(
  run:(context:{request:(pathname:string,options?:{method?:string;authorization?:string;body?:string;origin?:string})=>Promise<ApiResponse>;recorded:CareerContinuityFeedbackInput[]})=>Promise<void>,
  recorderOverride?:(input:CareerContinuityFeedbackInput)=>Promise<CareerContinuityFeedback>,
):Promise<void>{
  const recorded:CareerContinuityFeedbackInput[]=[];
  const recorder=recorderOverride??(async(input:CareerContinuityFeedbackInput)=>{
    recorded.push(input);
    return{id:'feedback-test',...input,createdAt:'2026-09-02T22:00:00.000Z'};
  });
  const server=createServer((request,response)=>void createCareerContinuityFeedbackHandler(recorder)(request,response));
  const previousToken=process.env.MUNIN_MOBILE_TOKEN;
  const previousWebPort=process.env.MUNIN_WEB_PORT;
  process.env.MUNIN_MOBILE_TOKEN=token;
  process.env.MUNIN_WEB_PORT='5173';
  try{
    await new Promise<void>((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
    const address=server.address();assert.ok(address&&typeof address==='object');
    const request=(pathname:string,options:{method?:string;authorization?:string;body?:string;origin?:string}={})=>new Promise<ApiResponse>((resolve,reject)=>{
      const headers:Record<string,string>={};
      if(options.authorization)headers.authorization=options.authorization;
      if(options.origin)headers.origin=options.origin;
      if(options.body!==undefined){headers['content-type']='application/json';headers['content-length']=String(Buffer.byteLength(options.body));}
      const requestOptions:RequestOptions={host:'127.0.0.1',port:address.port,path:pathname,method:options.method??'POST',headers};
      const outgoing=httpRequest(requestOptions,incoming=>{const chunks:Buffer[]=[];incoming.on('data',chunk=>chunks.push(Buffer.from(chunk)));incoming.once('end',()=>resolve({status:incoming.statusCode??0,headers:incoming.headers,text:Buffer.concat(chunks).toString('utf8')}));});
      outgoing.once('error',reject);if(options.body!==undefined)outgoing.write(options.body);outgoing.end();
    });
    await run({request,recorded});
  }finally{
    if(previousToken===undefined)delete process.env.MUNIN_MOBILE_TOKEN;else process.env.MUNIN_MOBILE_TOKEN=previousToken;
    if(previousWebPort===undefined)delete process.env.MUNIN_WEB_PORT;else process.env.MUNIN_WEB_PORT=previousWebPort;
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
}

test('career continuity feedback requires mobile bearer authorization',async()=>{
  await withApi(async({request,recorded})=>{
    for(const authorization of [undefined,'Bearer wrong-token']){
      const response=await request('/api/career/continuity/feedback',{authorization,body:JSON.stringify({jobId:'b3-digital-assets',verdict:'correct'})});
      assert.equal(response.status,401);
      assert.deepEqual(JSON.parse(response.text),{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
    }
    assert.deepEqual(recorded,[]);
  });
});

test('OPTIONS is unauthenticated and keeps local bearer CORS support',async()=>{
  await withApi(async({request})=>{
    const response=await request('/api/career/continuity/feedback',{method:'OPTIONS',origin:'http://127.0.0.1:5173'});
    assert.equal(response.status,204);
    assert.equal(response.headers['access-control-allow-origin'],'http://127.0.0.1:5173');
    assert.equal(response.headers['access-control-allow-headers'],'content-type, authorization');
  });
});

test('valid human judgment is normalized and recorded exactly once',async()=>{
  await withApi(async({request,recorded})=>{
    const response=await request('/api/career/continuity/feedback',{
      authorization:`Bearer ${token}`,
      body:JSON.stringify({jobId:'  b3-digital-assets  ',verdict:'needs_correction',note:'  Follow-up timing was wrong  '}),
    });
    assert.equal(response.status,201);
    assert.deepEqual(recorded,[{jobId:'b3-digital-assets',verdict:'needs_correction',note:'Follow-up timing was wrong'}]);
    assert.equal((JSON.parse(response.text) as CareerContinuityFeedback).verdict,'needs_correction');
  });
});

test('invalid, oversized, extra-field, and secret-bearing feedback is rejected without recording',async()=>{
  await withApi(async({request,recorded})=>{
    const privateSecret='Bearer abcdefghijklmnop1234';
    const rejected=[
      {verdict:'maybe'},
      {verdict:'correct',jobId:''},
      {verdict:'correct',note:''},
      {verdict:'correct',note:'x'.repeat(1_001)},
      {verdict:'correct',note:privateSecret},
      {verdict:'correct',synthetic:true},
    ];
    for(const body of rejected){
      const response=await request('/api/career/continuity/feedback',{authorization:`Bearer ${token}`,body:JSON.stringify(body)});
      assert.equal(response.status,400);
      assert.deepEqual(JSON.parse(response.text),{error:'Invalid career continuity feedback',code:'CAREER_CONTINUITY_FEEDBACK_INVALID'});
      assert.equal(response.text.includes(privateSecret),false);
    }
    assert.deepEqual(recorded,[]);
  });
});

test('oversized JSON, wrong methods, and wrong routes do not reach the recorder',async()=>{
  await withApi(async({request,recorded})=>{
    const oversized=await request('/api/career/continuity/feedback',{authorization:`Bearer ${token}`,body:JSON.stringify({verdict:'correct',note:'x'.repeat(2_100)})});
    assert.equal(oversized.status,400);
    for(const [pathname,method] of [['/api/career/continuity/feedback','GET'],['/api/career/continuity','POST'],['/api/career/continuity/feedback/extra','POST']] as const){
      const response=await request(pathname,{method,authorization:`Bearer ${token}`,body:method==='POST'?JSON.stringify({verdict:'correct'}):undefined});
      assert.equal(response.status,404);
    }
    assert.deepEqual(recorded,[]);
  });
});

test('unexpected recorder failures return a generic 500 without leaking details',async()=>{
  const privateError='C:\\Users\\private\\career-feedback.json Bearer private-token-value';
  await withApi(async({request})=>{
    const response=await request('/api/career/continuity/feedback',{authorization:`Bearer ${token}`,body:JSON.stringify({verdict:'correct'})});
    assert.equal(response.status,500);
    assert.deepEqual(JSON.parse(response.text),{error:'Internal server error',code:'INTERNAL_ERROR'});
    assert.equal(response.text.includes(privateError),false);
    assert.equal(response.text.includes('stack'),false);
  },async()=>{throw new Error(privateError);});
});
