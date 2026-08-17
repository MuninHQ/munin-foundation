import { careerContinuityReport } from './career-continuity-report.js';

const report=await careerContinuityReport();
console.log(JSON.stringify(report,null,2));
if(report.killCriterionTriggered)process.exitCode=2;
