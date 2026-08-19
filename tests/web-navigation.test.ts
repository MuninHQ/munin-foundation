import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const web=join(process.cwd(),'apps','web');
const publicDir=join(web,'public');
async function exists(path:string){try{await access(path);return true}catch{return false}}
function localTargets(html:string){const out=new Set<string>();for(const match of html.matchAll(/(?:href|src)=["'](\/[^"']+)["']/g)){const target=match[1].split(/[?#]/)[0];if(target.startsWith('/api/')||target.startsWith('//'))continue;if(target==='/'||/\.(?:html|js|css)$/.test(target))out.add(target)}return [...out]}

async function resolvesViteTarget(target:string){
 if(target==='/')return exists(join(web,'index.html'));
 const relative=target.replace(/^\//,'');
 return (await exists(join(web,relative)))||(await exists(join(publicDir,relative)));
}

test('standalone web pages do not point at missing local HTML/JS/CSS targets',async()=>{
 const files=(await readdir(web)).filter(name=>name.endsWith('.html'));
 const missing:string[]=[];
 for(const file of files){const html=await readFile(join(web,file),'utf8');for(const target of localTargets(html)){if(!(await resolvesViteTarget(target)))missing.push(`${file} -> ${target}`)}}
 assert.deepEqual(missing,[],`Broken local navigation/assets:\n${missing.join('\n')}`);
});

test('Career OS exposes quick intake from the main React workspace',async()=>{
 const app=await readFile(join(web,'src','App.tsx'),'utf8');
 assert.match(app,/career-intake\.html/);
 assert.match(app,/Analisar vaga/);
});
