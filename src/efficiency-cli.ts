import { pathToFileURL } from 'node:url';
import { EfficiencyRuntime } from './efficiency-runtime.js';

interface StatusRuntime<T extends Record<string, unknown>> { status(): Promise<T>; }
export async function efficiencyStatus<T extends Record<string, unknown>>(runtime: StatusRuntime<T> = new EfficiencyRuntime() as unknown as StatusRuntime<T>): Promise<T & { limitations: string[] }> {
  const status = await runtime.status();
  return { ...status, limitations: ['Token estimates use a local character heuristic.', 'Credit savings proxy is not realized provider billing savings.', 'Model routes are recommendations and do not bypass provider policy.'] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await efficiencyStatus(), null, 2));
