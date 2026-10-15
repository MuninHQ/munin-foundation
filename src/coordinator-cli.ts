#!/usr/bin/env node
import { buildCoordinatorStatus, coordinatorSitrep, delegateTask, type Authorization, type DelegationTier } from './coordinator.js';

// Deterministic coordinator entrypoint for the Claude Code mod and for humans.
//   coordinator status [--json]
//   coordinator sitrep [--json]
//   coordinator delegate --objective "<task>" [--tier deterministic|local|economy|strong] [--justification "<why>"]
//                        --authorized-via composer|bridge|cli [--actor <name>]
// Exit codes: 0 ok · 2 refused/blocked/unavailable · 1 unexpected error.

const [command='status',...rest]=process.argv.slice(2);
function flag(name:string){const i=rest.indexOf(`--${name}`);return i>=0?rest[i+1]:undefined}
const json=rest.includes('--json');

async function main(){
 if(command==='status'){
  const status=await buildCoordinatorStatus();
  process.stdout.write(`${JSON.stringify(status,null,json?0:2)}\n`);
  process.exitCode=status.severity==='unavailable'?2:0;return;
 }
 if(command==='sitrep'){
  const status=await buildCoordinatorStatus();const report=coordinatorSitrep(status);
  if(json)process.stdout.write(`${JSON.stringify({generatedAt:status.generatedAt,severity:status.severity,sources:status.sources,...report})}\n`);
  else process.stdout.write(`SITREP Munin — ${status.generatedAt}\n\n${report.summary.map(l=>`- ${l}`).join('\n')}\n\nPróximos passos:\n${report.nextSteps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n`);
  process.exitCode=status.severity==='unavailable'?2:0;return;
 }
 if(command==='delegate'){
  const objective=flag('objective')??'';
  const tier=(flag('tier')??'deterministic') as DelegationTier;
  if(!['deterministic','local','economy','strong'].includes(tier))throw new Error(`invalid tier: ${tier}`);
  const via=flag('authorized-via')??'unknown';
  const authorization:Authorization=['composer','bridge','cli'].includes(via)?{kind:'human',via:via as 'composer'|'bridge'|'cli',actor:flag('actor')}:{kind:via==='peer'||via==='plugin'||via==='sdk'?'agent':'unknown',via,actor:flag('actor')};
  const record=await delegateTask({objective,tier,justification:flag('justification'),authorization});
  process.stdout.write(`${JSON.stringify(record,null,json?0:2)}\n`);
  process.exitCode=record.status==='completed'?0:2;return;
 }
 process.stderr.write('Usage: coordinator status|sitrep [--json] | delegate --objective "<task>" --authorized-via composer|bridge|cli [--tier ...] [--justification ...]\n');
 process.exitCode=2;
}

main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1});
