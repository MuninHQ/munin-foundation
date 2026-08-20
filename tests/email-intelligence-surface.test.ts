import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path:string){return readFile(new URL(`../../${path}`,import.meta.url),'utf8')}

test('web email intelligence API is read-only snapshot projection',async()=>{
  const api=await source('src/email-intelligence-api.ts');
  assert.match(api,/request\.method==='GET'/);
  assert.match(api,/EmailIntelligenceStore/);
  assert.doesNotMatch(api,/syncCareerInbox|promoteEmailActions|sendMail|messages\.send|Mail\.Send/);
});

test('mobile email intelligence API requires existing mobile authorization',async()=>{
  const api=await source('src/email-mobile-api.ts');
  assert.match(api,/mobileAuthorized/);
  assert.match(api,/401/);
  assert.match(api,/request\.method==='GET'/);
  assert.doesNotMatch(api,/POST|syncCareerInbox|sendMail/);
});

test('unified server routes authenticated mobile email before generic mobile handler',async()=>{
  const server=await source('src/server.ts');
  const email=server.indexOf("'/api/mobile/email-intelligence'");
  const generic=server.indexOf("'/api/mobile'");
  assert.ok(email>=0&&generic>email);
  assert.match(server,/\/api\/email-intelligence/);
});

test('web and mobile expose email actions and worthwhile reads without send controls',async()=>{
  const html=await source('apps/web/email-intelligence.html');
  const mobileHtml=await source('apps/web/mobile.html');
  const mobile=await source('apps/web/src/email-mobile-controls.ts');
  assert.match(html,/Precisa de ação/);
  assert.match(html,/Vale a leitura/);
  assert.match(mobileHtml,/email-mobile-controls\.ts/);
  assert.match(mobile,/\/api\/mobile\/email-intelligence/);
  assert.match(mobile,/Authorization/);
  assert.doesNotMatch(`${html}\n${mobile}`,/sendMail|Mail\.Send|messages\.send|smtp|reply button/i);
});
