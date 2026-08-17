import { RuntimeCapabilityRegistry, type RuntimeCapability } from './runtime-capability-seam.js';

export interface CapabilityBenchmarkSample {
  iterations: number;
  directNs: number;
  seamNs: number;
  overheadNs: number;
  overheadRatio: number;
  traceEventsPerCall: number;
}

const noopCapability: RuntimeCapability<number, number> = {
  name: 'benchmark.noop',
  async execute(input) { return input + 1; },
};

export async function benchmarkCapabilitySeam(iterations = 1_000): Promise<CapabilityBenchmarkSample> {
  if (!Number.isInteger(iterations) || iterations < 10 || iterations > 100_000) {
    throw new Error('iterations must be an integer between 10 and 100000.');
  }

  let sink = 0;
  const directStart = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) sink += i + 1;
  const directNs = Number(process.hrtime.bigint() - directStart);

  const registry = new RuntimeCapabilityRegistry();
  registry.register(noopCapability);
  registry.intercept({ name: 'benchmark-before', phase: 'before', run() {} });
  registry.intercept({ name: 'benchmark-after', phase: 'after', run() {} });

  let traceEvents = 0;
  const seamStart = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) {
    const result = await registry.execute<number, number>('benchmark.noop', i);
    sink += result.output;
    traceEvents += result.trace.length;
  }
  const seamNs = Number(process.hrtime.bigint() - seamStart);
  void sink;

  return {
    iterations,
    directNs,
    seamNs,
    overheadNs: Math.max(0, seamNs - directNs),
    overheadRatio: directNs > 0 ? Math.round((seamNs / directNs) * 100) / 100 : 0,
    traceEventsPerCall: traceEvents / iterations,
  };
}
