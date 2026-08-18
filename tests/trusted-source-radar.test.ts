import assert from 'node:assert/strict';
import test from 'node:test';
import { isTrustedSignalFresh, trustedSignalFreshness } from '../src/trusted-source-radar.js';

test('trusted source freshness rejects missing and stale publication dates',()=>{
 const now=Date.parse('2026-08-18T12:00:00Z');
 assert.deepEqual(trustedSignalFreshness(undefined,now),{dateVerified:false});
 const recent=trustedSignalFreshness('2026-08-10T12:00:00Z',now);
 assert.equal(recent.dateVerified,true);
 assert.equal(recent.freshnessDays,8);
 assert.equal(isTrustedSignalFresh({publishedAt:'2026-08-10T12:00:00Z',...recent}),true);
 const stale=trustedSignalFreshness('2026-05-01T12:00:00Z',now);
 assert.equal(stale.dateVerified,true);
 assert.equal(isTrustedSignalFresh({publishedAt:'2026-05-01T12:00:00Z',...stale}),false);
});
