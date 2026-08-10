import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const children = [];

function run(command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: platform() === 'win32',
    env: process.env,
  });
  children.push(child);
  child.on('exit', code => {
    if (code && code !== 0) shutdown(code);
  });
  return child;
}

function openBrowser(url) {
  const target = platform() === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : platform() === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  const child = spawn(target[0], target[1], { stdio: 'ignore', detached: true });
  child.unref();
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting Munin Workspace...');
run('npm', ['run', 'api']);
run('npm', ['run', 'visual-assets-api']);
run('npm', ['run', 'linkedin-composer-api']);
run('npm', ['run', 'context-memory-api']);
run('npm', ['run', 'web', '--', '--host', '127.0.0.1']);
setTimeout(() => openBrowser('http://127.0.0.1:5173'), 2500);
