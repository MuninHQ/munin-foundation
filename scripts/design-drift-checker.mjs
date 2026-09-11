#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const configPath = path.resolve(cwd, process.argv[2] || 'design/drift.config.json');

function fail(message) {
  console.error(`[design-drift] tooling error: ${message}`);
  process.exitCode = 2;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walk(root, config, files = []) {
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && config.ignoreDirectories.includes(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walk(full, config, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = path.relative(cwd, full).replaceAll('\\', '/');
    if (config.ignoreFiles.includes(rel)) continue;
    if (!config.extensions.includes(path.extname(entry.name).toLowerCase())) continue;
    files.push(full);
  }
  return files;
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function pushRegexFindings(findings, text, file, rule, regex, messageForMatch) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    findings.push({
      rule: rule.id,
      severity: rule.severity,
      file,
      line: lineNumber(text, match.index),
      evidence: String(match[0]).slice(0, 160),
      message: messageForMatch(match)
    });
    if (match.index === regex.lastIndex) regex.lastIndex += 1;
  }
}

function ruleSpec(config, id) {
  const spec = config.rules[id];
  return spec && spec.enabled ? { id, ...spec } : null;
}

function inspectFile(fullPath, config) {
  const text = fs.readFileSync(fullPath, 'utf8');
  const file = path.relative(cwd, fullPath).replaceAll('\\', '/');
  const findings = [];

  const rawColor = ruleSpec(config, 'rawColorLiteral');
  if (rawColor) {
    pushRegexFindings(
      findings,
      text,
      file,
      rawColor,
      /#[0-9a-fA-F]{3,8}\b|\brgba?\([^\n;)]+\)|\bhsla?\([^\n;)]+\)/g,
      () => rawColor.description
    );
  }

  const inlineStyle = ruleSpec(config, 'inlineVisualStyle');
  if (inlineStyle) {
    pushRegexFindings(
      findings,
      text,
      file,
      inlineStyle,
      /\bstyle\s*=\s*(?:["'{])/g,
      () => inlineStyle.description
    );
  }

  const arbitrary = ruleSpec(config, 'arbitraryTailwindValue');
  if (arbitrary) {
    pushRegexFindings(
      findings,
      text,
      file,
      arbitrary,
      /\b(?:bg|text|border|shadow|rounded|p[trblxy]?|m[trblxy]?|gap|w|h)-\[[^\]]+\]/g,
      () => arbitrary.description
    );
  }

  const font = ruleSpec(config, 'fontFamilyLiteral');
  if (font) {
    pushRegexFindings(
      findings,
      text,
      file,
      font,
      /font-family\s*:\s*[^;}{]+/gi,
      () => font.description
    );
  }

  const radius = ruleSpec(config, 'largeRadius');
  if (radius) {
    const regex = /border-radius\s*:\s*(\d+(?:\.\d+)?)px/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const value = Number(match[1]);
      if (value <= radius.thresholdPx) continue;
      findings.push({
        rule: radius.id,
        severity: radius.severity,
        file,
        line: lineNumber(text, match.index),
        evidence: match[0],
        message: `${radius.description} Observed ${value}px; threshold ${radius.thresholdPx}px.`
      });
    }
  }

  const shadow = ruleSpec(config, 'largeBlurShadow');
  if (shadow) {
    const regex = /box-shadow\s*:\s*([^;}{]+)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const values = [...match[1].matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((item) => Math.abs(Number(item[1])));
      const largest = values.length ? Math.max(...values) : 0;
      if (largest <= shadow.thresholdPx) continue;
      findings.push({
        rule: shadow.id,
        severity: shadow.severity,
        file,
        line: lineNumber(text, match.index),
        evidence: match[0].slice(0, 160),
        message: `${shadow.description} Largest observed px component ${largest}; threshold ${shadow.thresholdPx}px.`
      });
    }
  }

  return findings;
}

try {
  if (!fs.existsSync(configPath)) throw new Error(`config not found: ${path.relative(cwd, configPath)}`);
  const config = readJson(configPath);
  const tokenPath = path.resolve(cwd, 'design/tokens.json');
  if (!fs.existsSync(tokenPath)) throw new Error('design/tokens.json is missing');
  readJson(tokenPath);

  if (!['observe', 'warn', 'enforce'].includes(config.mode)) {
    throw new Error(`unsupported mode: ${String(config.mode)}`);
  }

  const files = config.roots.flatMap((root) => walk(path.resolve(cwd, root), config));
  const findings = files.flatMap((file) => inspectFile(file, config));
  const byRule = findings.reduce((acc, finding) => {
    acc[finding.rule] = (acc[finding.rule] || 0) + 1;
    return acc;
  }, {});

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: config.mode,
    constitution: 'docs/design/DESIGN.md',
    tokens: 'design/tokens.json',
    scannedFiles: files.length,
    findingCount: findings.length,
    byRule,
    findings
  };

  const reportPath = path.resolve(cwd, config.report.jsonPath);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`## Munin design drift — ${config.mode}`);
  console.log(`Scanned ${files.length} files; observed ${findings.length} findings.`);
  for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`- ${rule}: ${count}`);
  }
  console.log(`Report: ${path.relative(cwd, reportPath).replaceAll('\\', '/')}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      `## Munin design drift — ${config.mode}`,
      '',
      `Scanned **${files.length}** files; observed **${findings.length}** findings.`,
      '',
      ...Object.entries(byRule).sort((a, b) => b[1] - a[1]).map(([rule, count]) => `- \`${rule}\`: ${count}`),
      '',
      '> Observation mode is diagnostic only: no files were changed and findings do not block the merge.',
      ''
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
  }

  if (config.mode === 'enforce' && findings.length > 0) process.exitCode = 1;
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
