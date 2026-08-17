import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSentryIssuesUrl, listSentryIssues, sentryConfigFromEnv, type FetchLike } from '../src/sentry-readonly-client.js';

test('Sentry env config requires token and organization without returning them from health',()=>{
 const config=sentryConfigFromEnv({SENTRY_AUTH_TOKEN:'token-1',SENTRY_ORG:'munin',SENTRY_BASE_URL:'https://sentry.io'} as NodeJS.ProcessEnv);
 assert.deepEqual(config,{baseUrl:'https://sentry.io',organization:'munin',token:'token-1'});
 assert.throws(()=>sentryConfigFromEnv({SENTRY_ORG:'munin'} as NodeJS.ProcessEnv),/SENTRY_AUTH_TOKEN/);
});

test('Sentry issues URL uses organization endpoint and bounded read-only query',()=>{
 const url=new URL(buildSentryIssuesUrl({baseUrl:'https://sentry.io',organization:'munin org',token:'x'},{query:'is:unresolved level:error',statsPeriod:'14d',limit:50,project:'web'}));
 assert.equal(url.pathname,'/api/0/organizations/munin%20org/issues/');
 assert.equal(url.searchParams.get('query'),'is:unresolved level:error');
 assert.equal(url.searchParams.get('statsPeriod'),'14d');
 assert.equal(url.searchParams.get('limit'),'50');
 assert.equal(url.searchParams.get('project'),'web');
 assert.throws(()=>buildSentryIssuesUrl({baseUrl:'https://sentry.io',organization:'munin',token:'x'},{limit:101}),/between 1 and 100/);
});

test('read-only Sentry client sends bearer GET and normalizes bounded issue snapshots',async()=>{
 let seenInit:RequestInit|undefined;let seenUrl='';
 const fetcher:FetchLike=async(input,init)=>{seenUrl=input;seenInit=init;return {ok:true,status:200,text:async()=>JSON.stringify([{id:'1',title:'Boom',count:'5',userCount:2,level:'error',extra:'ignored'},{invalid:true}])}};
 const issues=await listSentryIssues({baseUrl:'https://sentry.io',organization:'munin',token:'secret'},{limit:10},fetcher);
 assert.match(seenUrl,/\/organizations\/munin\/issues\//);
 assert.equal(seenInit?.method,'GET');
 assert.equal((seenInit?.headers as Record<string,string>).Authorization,'Bearer secret');
 assert.deepEqual(issues,[{id:'1',title:'Boom',level:'error',count:'5',userCount:2}]);
});

test('read-only Sentry client fails closed on HTTP and malformed payloads',async()=>{
 const config={baseUrl:'https://sentry.io',organization:'munin',token:'secret'};
 await assert.rejects(listSentryIssues(config,{},async()=>({ok:false,status:403,text:async()=>'forbidden'})),/HTTP 403/);
 await assert.rejects(listSentryIssues(config,{},async()=>({ok:true,status:200,text:async()=>'not-json'})),/invalid JSON/);
 await assert.rejects(listSentryIssues(config,{},async()=>({ok:true,status:200,text:async()=>'{}'})),/must be an array/);
});
