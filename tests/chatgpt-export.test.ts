import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatGptExport } from '../src/chatgpt-export.js';

test('extracts user-authored continuity records from ChatGPT export shape',()=>{
 const exportData=[{id:'c1',title:'Munin build',mapping:{a:{message:{author:{role:'user'},content:{parts:['Quero que o projeto Munin continue autonomamente até existir um bloqueio real.']},create_time:1786820000}},b:{message:{author:{role:'assistant'},content:{parts:['Entendido.']},create_time:1786820010}},c:{message:{author:{role:'user'},content:{parts:['Minha prioridade de carreira é uma vaga em produtos financeiros e ativos digitais.']},create_time:1786820020}}}}];
 const records=parseChatGptExport(exportData);assert.equal(records.length,2);assert.equal(records[0].source,'chatgpt-export:c1');assert.equal(records[0].confidence,'confirmed');assert.ok(records.every(record=>record.content!=='Entendido.'));assert.ok(records.some(record=>record.kind==='project'||record.kind==='preference'));assert.ok(records.some(record=>record.kind==='career'||record.kind==='goal'));
});

test('rejects unexpected export root shapes',()=>{assert.throws(()=>parseChatGptExport({}),/conversations array/)});
