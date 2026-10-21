import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

// design/tokens.json font.size.xs is the smallest readable size; only the brand wordmark may go below it.
const belowFloorAllowed=['.munin-mark','.munin-bar-brand strong'];

test('shared shell text stays at or above the font.size.xs token',async()=>{
  const [css,tokens]=await Promise.all([web('public/munin.css'),readFile(new URL('../../design/tokens.json',import.meta.url),'utf8')]);
  const floor=Number.parseInt(JSON.parse(tokens).font.size.xs.$value,10);
  const offenders:string[]=[];
  for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=rule[1].trim();
    for(const size of rule[2].matchAll(/(?:font-size|--text-[a-z]+):\s*(\d+)px/g)){
      if(Number(size[1])<floor&&!belowFloorAllowed.some(allowed=>selector.includes(allowed)))offenders.push(`${selector} -> ${size[1]}px`);
    }
  }
  assert.deepEqual(offenders,[],`Text below ${floor}px:\n${offenders.join('\n')}`);
});
