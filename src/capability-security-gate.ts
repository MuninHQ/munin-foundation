export type CapabilityTrustState='UNTRUSTED'|'SCANNED'|'RESTRICTED'|'TRUSTED';
export interface CapabilitySecurityInput{ id:string; source:string; manifest?:string; commands?:string[]; networkDomains?:string[]; permissions?:string[]; pinnedRevision?:string; license?:string; }
export interface CapabilitySecurityFinding{ code:string; severity:'low'|'medium'|'high'|'critical'; detail:string }
export interface CapabilitySecurityAssessment{ id:string; state:CapabilityTrustState; score:number; findings:CapabilitySecurityFinding[]; allowPromotion:boolean }
const dangerous=[/curl\s+[^|]+\|\s*(sh|bash)/i,/wget\s+[^|]+\|\s*(sh|bash)/i,/rm\s+-rf\s+\//i,/powershell.+-enc/i,/eval\s*\(/i,/child_process/i,/process\.env/i,/\.ssh\//i,/id_rsa/i,/token/i,/secret/i];
export function assessCapabilitySecurity(input:CapabilitySecurityInput):CapabilitySecurityAssessment{
 const findings:CapabilitySecurityFinding[]=[];
 if(!input.pinnedRevision)findings.push({code:'UNPINNED_SOURCE',severity:'high',detail:'Capability source is not pinned to an immutable revision.'});
 if(!input.license)findings.push({code:'LICENSE_MISSING',severity:'medium',detail:'License evidence is missing.'});
 const surface=[input.manifest??'',...(input.commands??[]),...(input.permissions??[])].join('\n');
 for(const pattern of dangerous)if(pattern.test(surface))findings.push({code:'DANGEROUS_PATTERN',severity:'high',detail:`Matched risky pattern ${String(pattern)}.`});
 if((input.permissions??[]).some(p=>/admin|root|all files|full disk|keychain|credential/i.test(p)))findings.push({code:'BROAD_PERMISSION',severity:'critical',detail:'Capability requests broad or credential-level permissions.'});
 if((input.networkDomains??[]).some(d=>d==='*'||d.includes('*')))findings.push({code:'OPEN_NETWORK',severity:'high',detail:'Capability requests wildcard network access.'});
 const penalty=findings.reduce((sum,f)=>sum+({low:.05,medium:.15,high:.3,critical:.6}[f.severity]),0);
 const score=Number(Math.max(0,1-penalty).toFixed(3));
 const critical=findings.some(f=>f.severity==='critical');
 const high=findings.some(f=>f.severity==='high');
 const state:CapabilityTrustState=critical?'UNTRUSTED':high?'RESTRICTED':findings.length?'SCANNED':'TRUSTED';
 return{id:input.id,state,score,findings,allowPromotion:state==='TRUSTED'||(state==='SCANNED'&&score>=.8)};
}
