import { browserHealth, inspectBrowserReadOnly, recommendBrowserBackend, type BrowserBenchmarkSample } from './browser-operator.js';
import { installBrowserPolicyGate, registerBrowserCapability } from './browser-capability.js';
import { RuntimeCapabilityRegistry } from './runtime-capability-seam.js';

export interface LocalBrowserValidationReport {
  generatedAt:string;
  targetUrl:string;
  samples:BrowserBenchmarkSample[];
  recommendation:ReturnType<typeof recommendBrowserBackend>;
  evidence:{firstSnapshot:boolean;secondSnapshot:boolean;permissionGateBlocked:boolean};
}

export async function verifyBrowserPermissionGate():Promise<boolean>{
  const registry=new RuntimeCapabilityRegistry();
  registerBrowserCapability(registry);
  installBrowserPolicyGate(registry);
  try{
    await registry.execute('browser.operator',{action:'click',url:'http://127.0.0.1'} as never);
    return false;
  }catch(error){return error instanceof Error&&/blocked|unsupported|unapproved/i.test(error.message);}
}

export async function runLocalBrowserValidation(targetUrl:string):Promise<LocalBrowserValidationReport>{
  const playwright=await browserHealth('playwright-cli');
  const browserUse=await browserHealth('browser-use');
  const permissionGateBlocked=await verifyBrowserPermissionGate();
  let firstSnapshot=false;
  let secondSnapshot=false;
  let navigationMs:number|undefined;
  let recoveryMs:number|undefined;
  let contextTokens:number|undefined;

  if(playwright.available){
    const firstStarted=Date.now();
    const first=await inspectBrowserReadOnly(targetUrl,'playwright-cli');
    navigationMs=Date.now()-firstStarted;
    firstSnapshot=Boolean(first.available&&first.snapshot);
    if(first.snapshot)contextTokens=Math.ceil(first.snapshot.length/4);
    const secondStarted=Date.now();
    const second=await inspectBrowserReadOnly(targetUrl,'playwright-cli');
    recoveryMs=Date.now()-secondStarted;
    secondSnapshot=Boolean(second.available&&second.snapshot);
  }

  const samples:BrowserBenchmarkSample[]=[{
    backend:'playwright-cli',available:playwright.available,navigationMs,recoveryMs,contextTokens,
    actionLog:true,replay:firstSnapshot&&secondSnapshot,permissionGate:permissionGateBlocked,mobileTrigger:false,
    notes:'Local read-only fixture validation. formMs and mobileTrigger intentionally unclaimed.',
  },{
    backend:'browser-use',available:browserUse.available,actionLog:false,replay:false,permissionGate:false,mobileTrigger:false,
    notes:browserUse.available?'Installed, but not promoted without an equivalent governed benchmark adapter.':'Not installed; Munin does not auto-install optional Browser Use.',
  }];
  return {generatedAt:new Date().toISOString(),targetUrl,samples,recommendation:recommendBrowserBackend(samples),evidence:{firstSnapshot,secondSnapshot,permissionGateBlocked}};
}
