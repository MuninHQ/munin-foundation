import { executionSandboxStatus } from './execution-sandbox.js';

const status = await executionSandboxStatus();
process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), sandbox: status }, null, 2) + '\n');
if (process.env.MUNIN_EXECUTION_SANDBOX === 'strict' && status.strength !== 'hard') process.exitCode = 1;
