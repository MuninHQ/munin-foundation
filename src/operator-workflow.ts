import { spawn } from 'node:child_process';
import { platform } from 'node:os';

export type OperatorWorkflowCommand = 'start' | 'build' | 'verify' | 'ship' | 'doctor' | 'mobile-test';

export type ProcessResult = { code: number; stdout: string; stderr: string };
export type ProcessRunner = (command: string, args: string[], options?: { capture?: boolean }) => Promise<ProcessResult>;

export type DoctorCheck = {
  name: string;
  status: 'ok' | 'attention';
  detail: string;
  required: boolean;
};

export type OperatorWorkflowResult = {
  command: OperatorWorkflowCommand;
  status: 'completed' | 'started' | 'attention';
  message: string;
  checks?: DoctorCheck[];
  pullRequestUrl?: string;
};

function executable(name: 'npm' | 'git' | 'gh'): string {
  return platform() === 'win32' && name === 'npm' ? 'npm.cmd' : name;
}

export const defaultProcessRunner: ProcessRunner = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  let stdout = '';
  let stderr = '';
  if (options.capture) {
    child.stdout?.on('data', chunk => { stdout += String(chunk); });
    child.stderr?.on('data', chunk => { stderr += String(chunk); });
  }
  child.once('error', reject);
  child.once('close', code => resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() }));
});

async function requireSuccess(runner: ProcessRunner, command: string, args: string[], label: string): Promise<ProcessResult> {
  const result = await runner(command, args);
  if (result.code !== 0) throw new Error(`${label} failed with exit code ${result.code}.`);
  return result;
}

async function capture(runner: ProcessRunner, command: string, args: string[]): Promise<ProcessResult> {
  try {
    return await runner(command, args, { capture: true });
  } catch (error) {
    return { code: 1, stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }
}

export async function diagnoseOperatorWorkflow(runner: ProcessRunner = defaultProcessRunner): Promise<DoctorCheck[]> {
  const specs = [
    { name: 'Node.js', command: process.execPath, args: ['--version'], required: true },
    { name: 'npm', command: executable('npm'), args: ['--version'], required: true },
    { name: 'Git', command: executable('git'), args: ['--version'], required: true },
    { name: 'GitHub CLI', command: executable('gh'), args: ['--version'], required: true },
    { name: 'Git repository', command: executable('git'), args: ['rev-parse', '--show-toplevel'], required: true },
    { name: 'Munin origin', command: executable('git'), args: ['remote', 'get-url', 'origin'], required: true },
    { name: 'Current branch', command: executable('git'), args: ['branch', '--show-current'], required: true },
  ] as const;
  const results = await Promise.all(specs.map(async spec => ({ spec, result: await capture(runner, spec.command, [...spec.args]) })));
  return results.map(({ spec, result }) => {
    let status: DoctorCheck['status'] = result.code === 0 ? 'ok' : 'attention';
    let detail = result.stdout || result.stderr || `exit ${result.code}`;
    if (spec.name === 'Munin origin' && result.code === 0 && !/MuninHQ\/munin-foundation(?:\.git)?$/i.test(result.stdout)) {
      status = 'attention';
      detail = `Unexpected origin: ${result.stdout}`;
    }
    return { name: spec.name, status, detail, required: spec.required };
  });
}

async function shipCurrentBranch(runner: ProcessRunner): Promise<OperatorWorkflowResult> {
  const branchResult = await capture(runner, executable('git'), ['branch', '--show-current']);
  const branch = branchResult.stdout.trim();
  if (branchResult.code !== 0 || !branch) throw new Error('Cannot determine the current Git branch.');
  if (branch === 'main' || branch === 'master') throw new Error('Ship refuses the default branch. Create or reuse one mission branch.');

  const status = await capture(runner, executable('git'), ['status', '--porcelain']);
  if (status.code !== 0) throw new Error('Cannot inspect the Git worktree.');
  if (status.stdout.trim()) throw new Error('Ship requires committed changes; it never stages unrelated files automatically.');

  await requireSuccess(runner, executable('npm'), ['test'], 'Verification');
  await requireSuccess(runner, executable('git'), ['push', '--set-upstream', 'origin', branch], 'Push');

  const existing = await capture(runner, executable('gh'), ['pr', 'list', '--head', branch, '--state', 'open', '--json', 'url', '--limit', '1']);
  if (existing.code !== 0) throw new Error('GitHub CLI is required to create or update the mission pull request.');
  const parsed = existing.stdout ? JSON.parse(existing.stdout) as Array<{ url?: string }> : [];
  if (parsed[0]?.url) return { command: 'ship', status: 'completed', message: 'Existing mission pull request updated.', pullRequestUrl: parsed[0].url };

  const title = branch.replace(/^(feat|fix|chore|docs|test)\//, '').replace(/[-_]+/g, ' ').trim();
  const created = await capture(runner, executable('gh'), [
    'pr', 'create', '--draft', '--base', 'main', '--head', branch,
    '--title', title ? `feat: ${title}` : 'feat: Munin mission',
    '--body', 'Automated Munin mission PR. Verification: `npm test`. Merge remains human-controlled.',
  ]);
  if (created.code !== 0) throw new Error(created.stderr || 'Draft pull request creation failed.');
  return { command: 'ship', status: 'completed', message: 'Draft mission pull request created.', pullRequestUrl: created.stdout.trim() };
}

export async function runOperatorWorkflow(command: OperatorWorkflowCommand, runner: ProcessRunner = defaultProcessRunner): Promise<OperatorWorkflowResult> {
  if (command === 'doctor') {
    const checks = await diagnoseOperatorWorkflow(runner);
    const requiredFailure = checks.some(check => check.required && check.status !== 'ok');
    return { command, status: requiredFailure ? 'attention' : 'completed', message: requiredFailure ? 'Required operator checks need attention.' : 'Operator workflow is ready.', checks };
  }
  if (command === 'build') {
    await requireSuccess(runner, executable('npm'), ['run', 'build'], 'Build');
    return { command, status: 'completed', message: 'Core and web builds completed.' };
  }
  if (command === 'verify') {
    await requireSuccess(runner, executable('npm'), ['test'], 'Verification');
    return { command, status: 'completed', message: 'Build and automated tests passed.' };
  }
  if (command === 'start') {
    await requireSuccess(runner, executable('npm'), ['run', 'workspace:supervisor'], 'Workspace start');
    return { command, status: 'started', message: 'Governed workspace supervisor stopped normally.' };
  }
  if (command === 'mobile-test') {
    await requireSuccess(runner, executable('npm'), ['run', 'mobile'], 'Mobile test runtime');
    return { command, status: 'started', message: 'Mobile test runtime stopped normally.' };
  }
  return shipCurrentBranch(runner);
}
