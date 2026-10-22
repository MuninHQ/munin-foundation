import { syncCareerGitHubIssues } from './career-github-issue-sync.js';
syncCareerGitHubIssues().then(result => {
  process.stdout.write(JSON.stringify(result) + '\n');
}).catch(error => {
  process.stderr.write(JSON.stringify({ status: 'failed', error: error instanceof Error ? error.message : 'Career GitHub sync failed' }) + '\n');
  process.exitCode = 1;
});
