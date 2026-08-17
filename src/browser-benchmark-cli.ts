import fs from 'node:fs/promises';
import path from 'node:path';
import { recommendBrowserBackend, type BrowserBenchmarkSample } from './browser-operator.js';

const input=process.argv[2];
if(!input){console.error('Usage: browser:benchmark <samples.json>');process.exitCode=2;}else{
 const fullPath=path.resolve(input);
 const raw=await fs.readFile(fullPath,'utf8');
 const samples=JSON.parse(raw) as BrowserBenchmarkSample[];
 if(!Array.isArray(samples)||samples.length===0)throw new Error('benchmark samples must be a non-empty array');
 const report=recommendBrowserBackend(samples);
 console.log(JSON.stringify({input:fullPath,...report},null,2));
 if(!report.recommended)process.exitCode=1;
}
