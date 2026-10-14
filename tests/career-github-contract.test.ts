import assert from 'node:assert/strict';
import test from 'node:test';
import { CAREER_ISSUE_MARKER, parseCareerGitHubIssue } from '../src/career-github-contract.js';
function issue(decision: string, url = 'https://www.linkedin.com/jobs/view/1234/') {
  return { number: 12, title: '[VAGA] Banco - Gerente de Produtos', html_url: 'https://github.com/MuninHQ/munin-core/issues/12', body: `${CAREER_ISSUE_MARKER}\n**URL:** ${url}\n**Empresa:** Banco\n**Cargo:** Gerente de Produtos\n**Decisao:** ${decision}\n**Analise:** Aderente a pagamentos.` };
}
test('parses an explicitly approved opportunity without authorizing an application', () => {
  const result = parseCareerGitHubIssue(issue('approved'));
  assert.equal(result?.decision, 'approved');
  assert.equal(result?.role, 'Gerente de Produtos');
  assert.equal(result?.url, 'https://www.linkedin.com/jobs/view/1234/');
});
test('keeps review and discard decisions distinct', () => {
  assert.equal(parseCareerGitHubIssue(issue('review'))?.decision, 'review');
  assert.equal(parseCareerGitHubIssue(issue('discarded'))?.decision, 'discarded');
});
test('rejects malformed, untrusted, or non-career issues', () => {
  assert.equal(parseCareerGitHubIssue(issue('send-application')), undefined);
  assert.equal(parseCareerGitHubIssue(issue('approved', 'file:///etc/passwd')), undefined);
  assert.equal(parseCareerGitHubIssue(issue('approved', 'http://127.0.0.1/')), undefined);
  assert.equal(parseCareerGitHubIssue({ ...issue('approved'), title: 'Ordinary issue' }), undefined);
  assert.equal(parseCareerGitHubIssue({ ...issue('approved'), pull_request: {} }), undefined);
  assert.equal(parseCareerGitHubIssue({ ...issue('approved'), body: '**URL:** https://example.com' }), undefined);
});
