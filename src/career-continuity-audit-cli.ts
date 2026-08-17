import { runCareerContinuityAudit } from './career-continuity-audit.js';

const report=await runCareerContinuityAudit();
console.log(JSON.stringify(report,null,2));
if(!report.healthy)process.exitCode=1;
