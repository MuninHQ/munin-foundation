export type SentryIssueSnapshot={id:string;title:string;culprit?:string;level?:string;status?:string;count?:string|number;userCount?:number;firstSeen?:string;lastSeen?:string;permalink?:string};
export type IncidentSeverity='low'|'medium'|'high'|'critical';
export type SentryIncidentSeed={source:'sentry';issueId:string;title:string;severity:IncidentSeverity;summary:string;evidence:string[];recommendedNextStep:string;autoFixEligible:boolean};

export function sentryObservabilityPolicy(){return {
 provider:'sentry' as const,
 mode:'read-only-triage' as const,
 authoritativeSource:'sentry-for-runtime-evidence' as const,
 repositoryAuthoritativeForCode:true,
 externalWriteAllowed:false,
 issueMutationAllowed:false,
 autoResolveAllowed:false,
 autoDeployAllowed:false,
 authEnv:'SENTRY_AUTH_TOKEN' as const,
 organizationEnv:'SENTRY_ORG' as const,
 baseUrlEnv:'SENTRY_BASE_URL' as const,
 defaultBaseUrl:'https://sentry.io' as const,
 rationale:'Sentry may provide production failure evidence for autonomous diagnosis, but Munin must not mutate Sentry issues, deploy, or perform consequential external writes without an explicit governed action.',
};}

export function validateSentryBaseUrl(value:string){const parsed=new URL(value);if(parsed.protocol!=='https:')throw new Error('Sentry base URL must use https.');if(parsed.username||parsed.password)throw new Error('Sentry base URL must not contain embedded credentials.');return parsed.origin;}

export function sentryConfigurationHealth(env:NodeJS.ProcessEnv=process.env){const policy=sentryObservabilityPolicy();let baseUrl:string;try{baseUrl=validateSentryBaseUrl(env[policy.baseUrlEnv]||policy.defaultBaseUrl)}catch(error){return {available:false,configured:false,baseUrl:env[policy.baseUrlEnv],detail:error instanceof Error?error.message:String(error),policy}}
 const token=Boolean(env[policy.authEnv]?.trim());const organization=Boolean(env[policy.organizationEnv]?.trim());const configured=token&&organization;return {available:configured,configured,baseUrl,detail:configured?'Sentry read-only API configuration is present.':'Set SENTRY_AUTH_TOKEN and SENTRY_ORG to enable production issue ingestion. No secret value is exposed.',policy};}

function severity(issue:SentryIssueSnapshot):IncidentSeverity{const level=(issue.level??'').toLowerCase();const count=Number(issue.count??0);const users=Number(issue.userCount??0);if(level==='fatal'||users>=100||count>=1000)return 'critical';if(level==='error'||users>=20||count>=100)return 'high';if(level==='warning'||users>=5||count>=20)return 'medium';return 'low'}

export function triageSentryIssue(issue:SentryIssueSnapshot):SentryIncidentSeed{if(!issue.id?.trim())throw new Error('Sentry issue id is required.');if(!issue.title?.trim())throw new Error('Sentry issue title is required.');const sev=severity(issue);const evidence=[`issue=${issue.id}`,`level=${issue.level??'unknown'}`,`status=${issue.status??'unknown'}`,`count=${issue.count??'unknown'}`,`users=${issue.userCount??'unknown'}`,`firstSeen=${issue.firstSeen??'unknown'}`,`lastSeen=${issue.lastSeen??'unknown'}`];if(issue.culprit)evidence.push(`culprit=${issue.culprit}`);return {source:'sentry',issueId:issue.id,title:issue.title,severity:sev,summary:`${sev.toUpperCase()} production issue: ${issue.title}`,evidence,recommendedNextStep:'Correlate the issue with repository history, reproduce when possible, run the bounded engineering mission, and require tests plus verification before proposing any release.',autoFixEligible:sev!=='critical'};}
