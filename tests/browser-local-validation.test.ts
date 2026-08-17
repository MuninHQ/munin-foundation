import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyBrowserPermissionGate } from '../src/browser-local-validation.js';

test('local browser validation proves consequential browser actions remain blocked',async()=>{
  assert.equal(await verifyBrowserPermissionGate(),true);
});
