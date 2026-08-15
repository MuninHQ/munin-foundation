import { promises as fs } from 'node:fs';
import path from 'node:path';

export type SkillPermission='read'|'local-write'|'git-write'|'network-read'|'external-write';
export type SkillMetadata={name:string;description:string;version:string;triggers:string[];permissions:SkillPermission[];source:string};
export type LoadedSkill=SkillMetadata & {instructions:string;path:string};

const DEFAULT_ROOT=path.resolve('skills');
function list(value:string|undefined){return (value??'').split(',').map(x=>x.trim()).filter(Boolean)}
function parseFrontmatter(text:string){const match=text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);if(!match)throw new Error('SKILL.md requires YAML-like frontmatter.');const fields:Record<string,string>={};for(const line of match[1].split(/\r?\n/)){const split=line.indexOf(':');if(split<1)continue;fields[line.slice(0,split).trim()]=line.slice(split+1).trim().replace(/^['"]|['"]$/g,'')}return {fields,body:match[2].trim()}}
function validPermission(value:string):value is SkillPermission{return ['read','local-write','git-write','network-read','external-write'].includes(value)}

export class SkillRegistry {
  constructor(private readonly root=DEFAULT_ROOT){}
  async discover():Promise<SkillMetadata[]>{let entries;try{entries=await fs.readdir(this.root,{withFileTypes:true})}catch(error:any){if(error?.code==='ENOENT')return [];throw error}const skills:SkillMetadata[]=[];for(const entry of entries.filter(x=>x.isDirectory())){const file=path.join(this.root,entry.name,'SKILL.md');try{const {fields}=parseFrontmatter(await fs.readFile(file,'utf8'));const permissions=list(fields.permissions);if(!fields.name||!fields.description||!fields.version)throw new Error(`${file} missing name, description or version`);if(permissions.some(value=>!validPermission(value)))throw new Error(`${file} contains invalid permission`);skills.push({name:fields.name,description:fields.description,version:fields.version,triggers:list(fields.triggers),permissions:permissions as SkillPermission[],source:fields.source||'munin-local'})}catch(error:any){if(error?.code!=='ENOENT')throw error}}return skills.sort((a,b)=>a.name.localeCompare(b.name))}
  async load(name:string):Promise<LoadedSkill>{const all=await this.discover();const metadata=all.find(x=>x.name===name);if(!metadata)throw new Error(`Skill not found: ${name}`);const directories=await fs.readdir(this.root,{withFileTypes:true});for(const directory of directories.filter(x=>x.isDirectory())){const file=path.join(this.root,directory.name,'SKILL.md');try{const parsed=parseFrontmatter(await fs.readFile(file,'utf8'));if(parsed.fields.name===name)return {...metadata,instructions:parsed.body,path:file}}catch(error:any){if(error?.code!=='ENOENT')throw error}}throw new Error(`Skill file not found: ${name}`)}
  async match(input:string,limit=5){const normalized=input.toLocaleLowerCase();const scored=(await this.discover()).map(skill=>{let score=0;for(const trigger of skill.triggers)if(normalized.includes(trigger.toLocaleLowerCase()))score+=2;for(const token of `${skill.name} ${skill.description}`.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u))if(token.length>3&&normalized.includes(token))score++;return {skill,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.skill.name.localeCompare(b.skill.name));return scored.slice(0,limit).map(x=>x.skill)}
  async contextFor(input:string,limit=2){const matches=await this.match(input,limit);return Promise.all(matches.map(skill=>this.load(skill.name)))}
  async securitySummary(){const skills=await this.discover();return {total:skills.length,externalWrite:skills.filter(x=>x.permissions.includes('external-write')).map(x=>x.name),gitWrite:skills.filter(x=>x.permissions.includes('git-write')).map(x=>x.name),localOnly:skills.filter(x=>x.permissions.every(p=>p==='read'||p==='local-write')).map(x=>x.name)}}
}
