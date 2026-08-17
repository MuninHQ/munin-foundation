import { inspectAutonomyReadiness } from './autonomy-readiness.js';

const report=await inspectAutonomyReadiness(process.cwd());
process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
process.exitCode=report.state==='blocked'?2:0;
