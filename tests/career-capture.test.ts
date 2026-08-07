import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCapturedMessage } from '../src/career-capture.js';

test('parses EML headers and body',()=>{
  const parsed=parseCapturedMessage({format:'eml',filename:'mail.eml',content:'From: Isabella <recrutamento@b3.com.br>\r\nSubject: Convite para entrevista B3\r\nDate: Thu, 6 Aug 2026 12:00:00 -0300\r\nContent-Type: text/plain\r\n\r\nGostaríamos de agendar uma entrevista sobre Digital Assets.'});
  assert.equal(parsed.subject,'Convite para entrevista B3');
  assert.equal(parsed.fromEmail,'recrutamento@b3.com.br');
  assert.match(parsed.snippet,/Digital Assets/);
  assert.match(parsed.providerMessageId,/^capture-/);
});

test('parses clipboard text and rejects MSG',()=>{
  const parsed=parseCapturedMessage({format:'text',filename:'clipboard.txt',content:'Subject: Application received\nFrom: careers@example.com\nThank you for applying'});
  assert.equal(parsed.subject,'Application received');
  assert.equal(parsed.fromEmail,'careers@example.com');
  assert.throws(()=>parseCapturedMessage({format:'msg',filename:'mail.msg',content:'binary'}),/salve a mensagem como \.eml/i);
});
