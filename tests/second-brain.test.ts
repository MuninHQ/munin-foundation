import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMemoryTimeline } from '../src/second-brain.js';

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
