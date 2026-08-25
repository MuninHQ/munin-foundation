import { runMuninSecurityBench } from './agent-security-policy-evaluator.js';

const report=runMuninSecurityBench();
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(report.escaped>0)process.exitCode=1;
