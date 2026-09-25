import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimePath } from './config.js';
import { buildTokenEfficiencyReport, readEfficiencyEvents } from './token-efficiency-report.js';
import { loadTokenEfficiencyConfig } from './token-efficiency-config.js';

async function main(): Promise<void> {
  const config = loadTokenEfficiencyConfig();
  if (!config.enabled || !config.reportEnabled) { process.stdout.write(`${JSON.stringify({ status: 'disabled' })}\n`); return; }
  const source = process.argv.find(arg => arg.startsWith('--source='))?.slice('--source='.length) ?? runtimePath('telemetry', 'agent-events.jsonl');
  const outputDir = runtimePath('token-efficiency', 'reports');
  const { events, invalidLines } = await readEfficiencyEvents(source);
  const report = buildTokenEfficiencyReport(events, { mode: 'projected', invalidLines });
  await mkdir(outputDir, { recursive: true });
  const output = path.join(outputDir, `report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ status: 'written', output, samples: report.samples.total, comparison: report.comparison })}\n`);
}

main().catch(error => {
  process.stderr.write(`${JSON.stringify({ status: 'failed', summary: error instanceof Error ? error.message : String(error) })}\n`);
  process.exitCode = 1;
});
