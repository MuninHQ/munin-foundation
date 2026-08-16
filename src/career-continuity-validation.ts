import { promises as fs } from 'node:fs';
import path from 'node:path';

export type CareerContinuityVerdict='correct'|'needs_correction';
export interface CareerContinuityFeedback{id:string;jobId?:string;verdict:CareerContinuityVerdict;note?:string;createdAt:string}
export interface CareerContinuityMetrics{total:number;correct:number;needsCorrection:number;accuracy:number;meetsTarget:boolean;target:number}
const filePath=()=>path.resolve('data/runtime/career-continuity-feedback.json');
async function read():Promise<CareerContinuityFeedback[]>{try{const raw=JSON.parse(await fs.readFile(filePath(),'utf8'));return Array.isArray(raw)?raw:[]}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return[];throw error}}
async function write(items:CareerContinuityFeedback[]){await fs.mkdir(path.dirname(filePath()),{recursive:true});await fs.writeFile(filePath(),JSON.stringify(items,null,2),'utf8')}
export async function recordCareerContinuityFeedback(input:{jobId?:string;verdict:CareerContinuityVerdict;note?:string}){const items=await read();const item:CareerContinuityFeedback={id:`career-feedback-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,jobId:input.jobId,verdict:input.verdict,note:input.note?.trim()||undefined,createdAt:new Date().toISOString()};items.push(item);await write(items.slice(-500));return item}
export async function careerContinuityMetrics():Promise<CareerContinuityMetrics>{const items=await read();const correct=items.filter(i=>i.verdict==='correct').length;const needsCorrection=items.length-correct;const accuracy=items.length?correct/items.length:0;const target=.8;return{total:items.length,correct,needsCorrection,accuracy,meetsTarget:items.length>=5&&accuracy>=target,target}}
