import { sentryConfigurationHealth, sentryObservabilityPolicy, triageSentryIssue, type SentryIncidentSeed, type SentryIssueSnapshot } from './sentry-observability.js';
import { RuntimeCapabilityRegistry, type RuntimeCapability } from './runtime-capability-seam.js';

export type SentryObservabilityCapabilityInput=
 | {action:'health'}
 | {action:'triage';issue:SentryIssueSnapshot};

export type SentryObservabilityCapabilityOutput=
 | {action:'health';health:ReturnType<typeof sentryConfigurationHealth>;policy:ReturnType<typeof sentryObservabilityPolicy>}
 | {action:'triage';incident:SentryIncidentSeed;policy:ReturnType<typeof sentryObservabilityPolicy>};

export function createSentryObservabilityCapability():RuntimeCapability<SentryObservabilityCapabilityInput,SentryObservabilityCapabilityOutput>{return {
 name:'observability.sentry',
 async execute(input){
  if(input.action==='health')return {action:'health',health:sentryConfigurationHealth(),policy:sentryObservabilityPolicy()};
  if(input.action==='triage')return {action:'triage',incident:triageSentryIssue(input.issue),policy:sentryObservabilityPolicy()};
  throw new Error(`Unsupported Sentry observability action: ${String((input as {action?:unknown}).action)}`);
 },
}}

export function registerSentryObservabilityCapability(registry:RuntimeCapabilityRegistry):void{if(!registry.has('observability.sentry'))registry.register(createSentryObservabilityCapability())}
