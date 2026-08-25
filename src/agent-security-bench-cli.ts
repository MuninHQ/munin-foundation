import { runMuninSecurityBench } from './agent-security-policy-evaluator.js';

const report=await runMuninSecurityBench();
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(report.failed>0)process.exitCode=1;
