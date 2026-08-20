import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCapability, CapabilityDecisionLog } from '../src/capability-radar.js';

test('radar hard-rejects paid or metered candidates by default', () => {
  assert.equal(assessCapability({ id:'paid', name:'Paid', source:'x', license:'MIT', metered:true, securityScore:1, maintenanceScore:1 }).decision, 'reject');
});

test('radar adopts strong zero-cost candidates and reviews weak evidence', () => {
  const good = assessCapability({ id:'good', name:'Good', source:'github', license:'MIT', securityScore:.9, maintenanceScore:.8, duplicationScore:.1 });
  assert.equal(good.decision, 'adopt');
  const weak = assessCapability({ id:'weak', name:'Weak', source:'github', securityScore:.4, maintenanceScore:.9, duplicationScore:.1 });
  assert.equal(weak.decision, 'review');
});

test('decision log prevents repeated research until explicitly revisited', () => {
  const log = new CapabilityDecisionLog();
  assert.equal(log.shouldReassess('x'), true);
  log.record({ id:'x', decision:'reject', score:0, reasons:['duplicate'] });
  assert.equal(log.shouldReassess('x'), false);
  assert.equal(log.list().length, 1);
});
