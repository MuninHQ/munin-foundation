import path from 'node:path';
import { benchmarkDocuments } from './document-benchmark.js';

const input=process.argv[2];
if(!input){console.error('Uso: npm run document:benchmark -- <pasta-com-arquivos> [pasta-saida]');process.exit(2)}
const output=process.argv[3]?path.resolve(process.argv[3]):undefined;
const report=await benchmarkDocuments(input,output);
console.log(JSON.stringify(report,null,2));
if(report.failed>0)process.exitCode=1;
