import { benchmarkCapabilitySeam } from './runtime-capability-benchmark.js';

const iterations=Number(process.argv[2]??'1000');
const result=await benchmarkCapabilitySeam(iterations);
process.stdout.write(JSON.stringify(result,null,2)+'\n');
