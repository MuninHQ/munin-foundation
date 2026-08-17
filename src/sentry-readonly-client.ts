import { sentryConfigurationHealth, type SentryIssueSnapshot } from './sentry-observability.js';

export type SentryListIssuesOptions={query?:string;statsPeriod?:string;limit?:number;project?:string};
export type SentryReadOnlyConfig={baseUrl:string;organization:string;token:string};
export type FetchLike=(input:string,init?:RequestInit)=>Promise<{ok:boolean;status:number;text():Promise<string>}>;

export function sentryConfigFromEnv(env:NodeJS.ProcessEnv=process.env):SentryReadOnlyConfig{
 const health=sentryConfigurationHealth(env);if(!health.available)throw new Error(health.detail);
 return {baseUrl:health.baseUrl!,organization:env.SENTRY_ORG!.trim(),token:env.SENTRY_AUTH_TOKEN!.trim()};
}

function boundedLimit(value:number|undefined){const limit=value??25;if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Sentry issue limit must be an integer between 1 and 100.');return limit}

export function buildSentryIssuesUrl(config:SentryReadOnlyConfig,options:SentryListIssuesOptions={}){const org=encodeURIComponent(config.organization);const url=new URL(`/api/0/organizations/${org}/issues/`,config.baseUrl);url.searchParams.set('query',options.query??'is:unresolved');url.searchParams.set('statsPeriod',options.statsPeriod??'24h');url.searchParams.set('limit',String(boundedLimit(options.limit)));if(options.project)url.searchParams.append('project',options.project);return url.toString()}

function normalizeIssue(value:any):SentryIssueSnapshot|undefined{if(!value||typeof value!=='object'||typeof value.id!=='string'||typeof value.title!=='string')return undefined;return {id:value.id,title:value.title,culprit:typeof value.culprit==='string'?value.culprit:undefined,level:typeof value.level==='string'?value.level:undefined,status:typeof value.status==='string'?value.status:undefined,count:typeof value.count==='string'||typeof value.count==='number'?value.count:undefined,userCount:typeof value.userCount==='number'?value.userCount:undefined,firstSeen:typeof value.firstSeen==='string'?value.firstSeen:undefined,lastSeen:typeof value.lastSeen==='string'?value.lastSeen:undefined,permalink:typeof value.permalink==='string'?value.permalink:undefined}}

export async function listSentryIssues(config:SentryReadOnlyConfig,options:SentryListIssuesOptions={},fetcher:FetchLike=globalThis.fetch as unknown as FetchLike):Promise<SentryIssueSnapshot[]>{const response=await fetcher(buildSentryIssuesUrl(config,options),{method:'GET',headers:{Authorization:`Bearer ${config.token}`,Accept:'application/json'}});const text=await response.text();if(!response.ok)throw new Error(`Sentry read-only issue request failed with HTTP ${response.status}.`);let parsed:unknown;try{parsed=JSON.parse(text)}catch{throw new Error('Sentry returned invalid JSON.')}if(!Array.isArray(parsed))throw new Error('Sentry issue response must be an array.');return parsed.map(normalizeIssue).filter((item):item is SentryIssueSnapshot=>Boolean(item)).slice(0,boundedLimit(options.limit))}
