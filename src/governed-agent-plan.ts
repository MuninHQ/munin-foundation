import type { MuninAgentDefinition, MuninAgentId, MuninWorkType } from './agent-orchestrator.js';

export type GovernanceAgentId = 'chief-developer' | 'architect' | 'security-reviewer' | 'cost-guardian' | 'blocker-resolver';

export const GOVERNANCE_AGENT_REGISTRY: Record<GovernanceAgentId, MuninAgentDefinition & { id: GovernanceAgentId }> = {
  'chief-developer': { id:'chief-developer' as MuninAgentId, name:'Munin Chief Developer', mission:'Own delivery decomposition, parallel lanes, WIP, consensus gates, blocker rerouting and completion evidence.', capabilities:['decomposition','parallelism','consensus','wip','delivery'] },
  architect: { id:'architect' as MuninAgentId, name:'Munin Architect', mission:'Protect architectural coherence, reversible interfaces, dependency boundaries and long-term maintainability.', capabilities:['architecture','interfaces','dependency-review','reversibility'] },
  'security-reviewer': { id:'security-reviewer' as MuninAgentId, name:'Munin Security Reviewer', mission:'Detect unsafe privilege, secret, network and destructive-action risks before execution.', capabilities:['security','secrets','permissions','threat-model'] },
  'cost-guardian': { id:'cost-guardian' as MuninAgentId, name:'Munin Cost Guardian', mission:'Enforce the zero-additional-cost default and block unapproved paid or metered dependencies.', capabilities:['cost','metering','dependency-policy','approval-gate'] },
  'blocker-resolver': { id:'blocker-resolver' as MuninAgentId, name:'Munin Blocker Resolver', mission:'Classify blockers, reroute recoverable work and isolate genuine device/human boundaries without stopping independent lanes.', capabilities:['blockers','rerouting','recovery','device-boundary'] },
};

export function buildGovernedAgentPlan(workType: MuninWorkType): string[] {
  switch(workType){
    case 'product': return ['chief-developer','product-state-manager','cost-guardian','memory-curator'];
    case 'research': return ['chief-developer','researcher','architect','cost-guardian','product-state-manager','memory-curator'];
    case 'engineering': return ['chief-developer','product-state-manager','architect','security-reviewer','cost-guardian','engineer','qa-verifier','blocker-resolver','memory-curator','operator'];
    case 'verification': return ['chief-developer','qa-verifier','security-reviewer','blocker-resolver','product-state-manager','memory-curator'];
    case 'memory': return ['chief-developer','memory-curator','product-state-manager'];
    case 'operations': return ['chief-developer','operator','security-reviewer','blocker-resolver','qa-verifier','memory-curator'];
    case 'mixed': return ['chief-developer','product-state-manager','researcher','architect','security-reviewer','cost-guardian','engineer','qa-verifier','blocker-resolver','memory-curator','operator'];
  }
}
