import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DocumentBenchmarkReport } from './document-benchmark.js';
import { evaluateDocumentPromotion } from './document-promotion-gate.js';

const input=process.argv[2]??path.resolve('data/runtime/document-benchmark/benchmark-report.json');
const report=JSON.parse(await fs.readFile(path.resolve(input),'utf8')) as DocumentBenchmarkReport;
const decision=evaluateDocumentPromotion(report);
console.log(JSON.stringify(decision,null,2));
if(decision.verdict==='reject')process.exitCode=1;
if(decision.verdict==='insufficient_evidence')process.exitCode=2;
