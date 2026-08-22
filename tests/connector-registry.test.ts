import test from 'node:test';
import assert from 'node:assert/strict';
import { connectorRegistry } from '../src/connector-registry.js';
import type { TrustedSourceSnapshot } from '../src/trusted-source-radar.js';

test('connector registry makes source and OAuth health visible',()=>{
 const radar={signals:[],sources:[{id:'bcb',name:'Banco Central do Brasil',url:'https://bcb.gov.br',authority:'national-regulator',weight:1}],status:[{sourceId:'bcb',ok:true,count:3,fetchedAt:'2026-08-22T12:00:00Z'}],fetchedAt:'2026-08-22T12:00:00Z',expiresAt:'2026-08-22T13:00:00Z'} satisfies TrustedSourceSnapshot;
 const items=connectorRegistry(radar,[{provider:'gmail',connected:true},{provider:'outlook',connected:false}]);
 assert.equal(items.find(x=>x.id==='bcb')?.health,'healthy');
 assert.equal(items.find(x=>x.id==='gmail')?.health,'healthy');
 assert.equal(items.find(x=>x.id==='outlook')?.health,'not-connected');
 assert.ok(items.every(x=>x.cost==='free'));
});
