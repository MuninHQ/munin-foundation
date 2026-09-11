import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const checker = path.resolve('scripts/design-drift-checker.mjs');

function fixture(mode) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'munin-design-drift-'));
  fs.mkdirSync(path.join(root, 'design'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ui'), { recursive: true });
  fs.writeFileSync(path.join(root, 'design', 'tokens.json'), '{}\n');
  fs.writeFileSync(
    path.join(root, 'ui', 'sample.css'),
    '.sample { color: #ff0000; border-radius: 32px; }\n'
  );
  fs.writeFileSync(
    path.join(root, 'design', 'drift.config.json'),
    JSON.stringify({
      version: 1,
      mode,
      roots: ['ui'],
      extensions: ['.css'],
      ignoreDirectories: [],
      ignoreFiles: [],
      rules: {
        rawColorLiteral: { enabled: true, severity: 'info', description: 'raw color' },
        inlineVisualStyle: { enabled: false },
        arbitraryTailwindValue: { enabled: false },
        fontFamilyLiteral: { enabled: false },
        largeRadius: { enabled: true, severity: 'info', thresholdPx: 20, description: 'large radius' },
        largeBlurShadow: { enabled: false }
      },
      report: { jsonPath: '.artifacts/report.json' }
    }, null, 2)
  );
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [checker, path.join(root, 'design', 'drift.config.json')], {
    cwd: root,
    encoding: 'utf8'
  });
}

test('observe mode reports drift without blocking or rewriting source', () => {
  const root = fixture('observe');
  const source = path.join(root, 'ui', 'sample.css');
  const before = fs.readFileSync(source, 'utf8');
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(source, 'utf8'), before);
  const report = JSON.parse(fs.readFileSync(path.join(root, '.artifacts', 'report.json'), 'utf8'));
  assert.equal(report.mode, 'observe');
  assert.equal(report.findingCount, 2);
  assert.equal(report.byRule.rawColorLiteral, 1);
  assert.equal(report.byRule.largeRadius, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('enforce mode can fail on the same findings without changing files', () => {
  const root = fixture('enforce');
  const source = path.join(root, 'ui', 'sample.css');
  const before = fs.readFileSync(source, 'utf8');
  const result = run(root);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(fs.readFileSync(source, 'utf8'), before);
  fs.rmSync(root, { recursive: true, force: true });
});
