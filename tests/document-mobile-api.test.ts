import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBase64Payload, safeUploadName } from '../src/document-mobile-api.js';

test('sanitizes mobile upload filenames',()=>{
 assert.equal(safeUploadName('../../CV André?.pdf'),'CV Andr-.pdf');
 assert.equal(safeUploadName('report 2026.docx'),'report 2026.docx');
 assert.throws(()=>safeUploadName('..'));
});

test('decodes bounded base64 document payloads',()=>{
 const value=Buffer.from('munin').toString('base64');assert.equal(decodeBase64Payload(value).toString('utf8'),'munin');assert.equal(decodeBase64Payload(`data:text/plain;base64,${value}`).toString('utf8'),'munin');assert.throws(()=>decodeBase64Payload('%%%'),/base64/i);
});
