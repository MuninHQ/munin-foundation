import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { commitLovableImport, previewLovableImport, type LovableSnapshot } from '../src/lovable-import.js';
import { ContextStore } from '../src/store.js';
import type { MuninState } from '../src/types.js';

const empty: MuninState = { projects:[], decisions:[], actions:[], jobs:[], research:[], relations:[] };
const snapshot: LovableSnapshot = { source:'career-os', tables:{
  jobs:[{ id:'12345678-aaaa', company_name:'B3', title:'Digital Assets', status:'interview', fit_score:94, is_demo:false, created_at:'2026-08-01T00:00:00Z', updated_at:'2026-08-02T00:00:00Z' },{ id:'demo', company_name:'Demo', title:'Ignore', is_demo:true }],
  applications:[{ id:'a1', job_id:'12345678-aaaa', stage:'interview', is_demo:false }],
  companies:[{ id:'c1', name:'B3', is_demo:false }], email_messages:[{ id:'e1', message_id:'m1', body:'private', is_demo:false }],
  projects:[], actions:[], contacts:[], interviews:[], follow_ups:[], documents:[], email_classifications:[], email_job_links:[], activities:[]
} };

test('preview excludes demo rows and reports archive', () => {
  const report = previewLovableImport(snapshot,empty);
  assert.equal(report.create.jobs,1); assert.equal(report.counts.jobs,1); assert.equal(report.archived.email_messages,1);
});

test('commit imports jobs idempotently and writes local archive', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(),'munin-lovable-')); const store = new ContextStore(root);
  const first = await commitLovableImport(snapshot,store); const second = await commitLovableImport(snapshot,store); const state = await store.load();
  assert.equal(state.jobs.length,1); assert.equal(state.jobs[0].company,'B3'); assert.equal(state.jobs[0].status,'interview');
  assert.equal(second.duplicates.jobs,1); assert.match(await readFile(first.archivePath,'utf8'),/"email_messages"/);
});
