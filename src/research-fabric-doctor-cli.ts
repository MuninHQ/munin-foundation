import { createWave1ResearchAdapters } from './research-adapters.js';
import { ResearchFabric, researchFabricEnabled } from './research-fabric.js';

const enabled = researchFabricEnabled();
const fabric = new ResearchFabric(createWave1ResearchAdapters(), enabled);
const sources = await fabric.doctor();
const summary = {
  feature:'MUNIN_RESEARCH_FABRIC_V1',
  enabled,
  mode:'read-only',
  sources,
  healthy:sources.filter(item => item.state === 'healthy').length,
  unavailable:sources.filter(item => item.state === 'unavailable').map(item => item.source),
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.exitCode = sources.some(item => item.state === 'unavailable') ? 1 : 0;
