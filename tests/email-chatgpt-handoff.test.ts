import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildEmailHandoffPrompt } from '../apps/web/src/email-chatgpt-handoff.js';

test('email handoff contains bounded metadata and never authorizes sending',()=>{
  const prompt=buildEmailHandoffPrompt({subject:'Interview follow-up',from:'Recruiter <r@example.com>',attention:'career',reason:'Explicit response requested'},'reply');
  assert.match(prompt,/Interview follow-up/);
  assert.match(prompt,/r@example\.com/);
  assert.match(prompt,/apenas um rascunho/i);
  assert.match(prompt,/não envie/i);
  assert.doesNotMatch(prompt,/access[_ -]?token|refresh[_ -]?token|authorization: bearer/i);
});

test('analysis handoff asks connected mailbox to resolve thread rather than embedding body',()=>{
  const prompt=buildEmailHandoffPrompt({subject:'BCB stablecoin report',from:'newsletter@example.com',score:8,reasons:['digital assets','regulation']},'analyze');
  assert.match(prompt,/integração de e-mail/i);
  assert.match(prompt,/remetente \+ assunto/i);
  assert.doesNotMatch(prompt,/snippet|body|corpo do e-mail/i);
});

test('mobile email UI preserves sync health and delegates to ChatGPT without mail send code',async()=>{
  const source=await readFile(new URL('../../apps/web/src/email-mobile-controls.ts',import.meta.url),'utf8');
  assert.match(source,/handoffEmailToChatGPT/);
  assert.match(source,/PREPARAR NO CHATGPT/);
  assert.match(source,/ANALISAR NO CHATGPT/);
  assert.match(source,/SYNC:/);
  assert.doesNotMatch(source,/sendMail|messages\.send|Mail\.Send|smtp/i);
});
