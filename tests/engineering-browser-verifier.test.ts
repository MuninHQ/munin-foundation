import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadOnlyBrowserEngineeringVerifier } from '../src/engineering-browser-verifier.js';

test('browser engineering verifier validates and normalizes target URL',()=>{
 const verifier=new ReadOnlyBrowserEngineeringVerifier('http://127.0.0.1:5173/dashboard');
 assert.equal(verifier.url,'http://127.0.0.1:5173/dashboard');
});

test('browser engineering verifier rejects unsafe URL schemes before execution',()=>{
 assert.throws(()=>new ReadOnlyBrowserEngineeringVerifier('file:///etc/passwd'),/only http\/https/);
});

test('browser engineering verifier keeps promoted backend limited to Playwright CLI',()=>{
 assert.throws(()=>new ReadOnlyBrowserEngineeringVerifier('https://example.com','browser-use'),/Playwright CLI only/);
});
