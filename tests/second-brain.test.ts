import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMemoryTimeline, stripLeakedCmdEscapes } from '../src/second-brain.js';

test('parses newest second-brain session events first',()=>{
 const markdown=`# Session Log\n\n## 2026-09-04T10:00:00.000Z — MEMORY PRE-TASK · munin\n\nTask: inspect memory\n\n## 2026-09-04T10:30:00.000Z — MEMORY POST-TASK · munin\n\nImplemented recall and commit.\n`;
 const items=parseMemoryTimeline(markdown);
 assert.equal(items.length,2);
 assert.equal(items[0].title,'MEMORY POST-TASK · munin');
 assert.equal(items[0].summary,'Implemented recall and commit.');
 assert.equal(items[1].title,'MEMORY PRE-TASK · munin');
});

test('timeline respects the requested limit',()=>{
 const markdown=`## 2026-09-04T10:00:00.000Z — one\n\na\n\n## 2026-09-04T11:00:00.000Z — two\n\nb\n`;
 const items=parseMemoryTimeline(markdown,1);
 assert.equal(items.length,1);
 assert.equal(items[0].title,'two');
});

test('strips cmd.exe caret escapes leaked by nested npm run on Windows',()=>{
 assert.equal(stripLeakedCmdEscapes('^Fix^ Research^ Fabric^ YouTube^ search^ buffer^'),'Fix Research Fabric YouTube search buffer');
 assert.equal(stripLeakedCmdEscapes('^Owner-authorized^ redraw^ ^(full^ body,^ 48px+^)^'),'Owner-authorized redraw (full body, 48px+)');
 assert.equal(stripLeakedCmdEscapes('^munin^'),'munin');
 assert.equal(stripLeakedCmdEscapes('^a^ b^ ^|^ c^'),'a b | c');
});

test('keeps legitimate carets untouched',()=>{
 assert.equal(stripLeakedCmdEscapes('bump vite to ^6.4.5'),'bump vite to ^6.4.5');
 assert.equal(stripLeakedCmdEscapes('^6.4.5'),'^6.4.5');
 assert.equal(stripLeakedCmdEscapes('plain summary'),'plain summary');
});

test('timeline hides leaked caret escapes from historic session-log entries',()=>{
 const markdown=`## 2026-09-08T20:05:04.629Z — MEMORY POST-TASK · ^Munin^ Research^ Fabric^\n\n^Fixed^ the^ buffer^\n`;
 const [item]=parseMemoryTimeline(markdown);
 assert.equal(item.title,'MEMORY POST-TASK · Munin Research Fabric');
 assert.equal(item.summary,'Fixed the buffer');
});
