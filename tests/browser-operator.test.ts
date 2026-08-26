import test from 'node:test';
import assert from 'node:assert/strict';
import { browserHealth, browserOperatorPolicy, recommendBrowserBackend, resolveBrowserInvocation, scoreBrowserBenchmark, validateBrowserInspectionUrl } from '../src/browser-operator.js';

test('prefers Playwright CLI without requiring a paid cloud',()=>{
 const policy=browserOperatorPolicy();assert.equal(policy.preferred,'playwright-cli');assert.equal(policy.fallback,'browser-use');assert.equal(policy.cloudRequired,false);assert.equal(policy.paidDependencyRequired,false);assert.equal(policy.actionPolicyRequired,true);assert.equal(policy.benchmarkRequiredBeforePromotion,true);assert.deepEqual(policy.allowedActions,['health','inspect']);assert.equal(policy.inspectMode,'read-only-navigation-and-snapshot');
});

test('read-only browser inspection accepts local and public http URLs',()=>{
 assert.equal(validateBrowserInspectionUrl('http://127.0.0.1:5173/dashboard'),'http://127.0.0.1:5173/dashboard');
 assert.equal(validateBrowserInspectionUrl('https://example.com/path?q=1'),'https://example.com/path?q=1');
});

test('read-only browser inspection blocks unsafe URL classes and metadata endpoints',()=>{
 assert.throws(()=>validateBrowserInspectionUrl('file:///etc/passwd'),/only http\/https/);
 assert.throws(()=>validateBrowserInspectionUrl('javascript:alert(1)'),/only http\/https/);
 assert.throws(()=>validateBrowserInspectionUrl('https://user:pass@example.com'),/embedded credentials/);
 assert.throws(()=>validateBrowserInspectionUrl('http://169.254.169.254/latest/meta-data'),/metadata endpoints/);
 assert.throws(()=>validateBrowserInspectionUrl('http://metadata.google.internal/computeMetadata/v1'),/metadata endpoints/);
});

test('Windows Playwright CLI resolves through node instead of executing the .cmd shim directly',()=>{
 const bin='C:\\Users\\night\\AppData\\Roaming\\npm';
 const script='C:\\Users\\night\\AppData\\Roaming\\npm\\node_modules\\@playwright\\cli\\playwright-cli.js';
 const invocation=resolveBrowserInvocation('playwright-cli','win32',bin,candidate=>candidate===script);
 assert.equal(invocation.command,process.execPath);
 assert.deepEqual(invocation.argsPrefix,[script]);
 assert.equal(invocation.displayCommand,`${process.execPath} ${script}`);
});

test('Windows Playwright resolution preserves the .cmd fallback when the node entrypoint is absent',()=>{
 const invocation=resolveBrowserInvocation('playwright-cli','win32','C:\\Users\\night\\AppData\\Roaming\\npm',()=>false);
 assert.equal(invocation.command,'playwright-cli.cmd');
 assert.deepEqual(invocation.argsPrefix,[]);
 assert.equal(invocation.displayCommand,'playwright-cli.cmd');
});

test('missing local browser backend degrades to health status instead of crashing',async()=>{
 const health=await browserHealth('playwright-cli');assert.equal(health.backend,'playwright-cli');assert.equal(typeof health.available,'boolean');assert.ok(health.command);
});

test('browser benchmark rejects backends without audit and permission gates',()=>{
 const result=scoreBrowserBenchmark({backend:'browser-use',available:true,actionLog:false,replay:true,permissionGate:false,mobileTrigger:true,navigationMs:100,formMs:100,recoveryMs:100,contextTokens:100,memoryMb:100});
 assert.equal(result.eligible,false);assert.equal(result.score,0);assert.ok(result.reasons.includes('missing action log'));assert.ok(result.reasons.includes('missing deterministic permission gate'));
});

test('browser benchmark recommends highest-scoring eligible backend',()=>{
 const recommendation=recommendBrowserBackend([
  {backend:'playwright-cli',available:true,actionLog:true,replay:true,permissionGate:true,mobileTrigger:true,navigationMs:500,formMs:700,recoveryMs:1200,contextTokens:1200,memoryMb:250},
  {backend:'browser-use',available:true,actionLog:true,replay:true,permissionGate:true,mobileTrigger:true,navigationMs:1200,formMs:1800,recoveryMs:800,contextTokens:9000,memoryMb:600},
 ]);
 assert.equal(recommendation.recommended,'playwright-cli');assert.equal(recommendation.ranked.length,2);assert.ok(recommendation.ranked[0].score>recommendation.ranked[1].score);
});
