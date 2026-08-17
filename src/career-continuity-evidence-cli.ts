import { careerContinuityEvidenceReport } from './career-continuity-evidence.js';

const report=await careerContinuityEvidenceReport();
console.log(JSON.stringify(report,null,2));
if(report.status==='structural_failure'||report.status==='at_risk')process.exitCode=1;
