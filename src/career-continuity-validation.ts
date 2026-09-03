import { promises as fs } from 'node:fs';
import path from 'node:path';
import { sensitiveTextClasses } from './secret-redaction.js';

export type CareerContinuityVerdict='correct'|'needs_correction';
export interface CareerContinuityFeedback{id:string;jobId?:string;verdict:CareerContinuityVerdict;note?:string;createdAt:string}
export interface CareerContinuityMetrics{total:number;correct:number;needsCorrection:number;accuracy:number;meetsTarget:boolean;target:number}
export interface CareerContinuityFeedbackInput{jobId?:string;verdict:CareerContinuityVerdict;note?:string}
export class CareerContinuityFeedbackValidationError extends Error{constructor(){super('Invalid career continuity feedback');this.name='CareerContinuityFeedbackValidationError'}}
const filePath=()=>path.resolve('data/runtime/career-continuity-feedback.json');
async function read():Promise<CareerContinuityFeedback[]>{try{const raw=JSON.parse(await fs.readFile(filePath(),'utf8'));return Array.isArray(raw)?raw:[]}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return[];throw error}}
async function write(items:CareerContinuityFeedback[]){await fs.mkdir(path.dirname(filePath()),{recursive:true});await fs.writeFile(filePath(),JSON.stringify(items,null,2),'utf8')}
export function validateCareerContinuityFeedback(input:unknown):CareerContinuityFeedbackInput{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new CareerContinuityFeedbackValidationError();
  const record=input as Record<string,unknown>;
  if(Object.keys(record).some(key=>!['jobId','verdict','note'].includes(key)))throw new CareerContinuityFeedbackValidationError();
  if(record.verdict!=='correct'&&record.verdict!=='needs_correction')throw new CareerContinuityFeedbackValidationError();
  const jobId=record.jobId===undefined?undefined:typeof record.jobId==='string'?record.jobId.trim():undefined;
  const note=record.note===undefined?undefined:typeof record.note==='string'?record.note.trim():undefined;
  if(record.jobId!==undefined&&(!jobId||jobId.length>200))throw new CareerContinuityFeedbackValidationError();
  if(record.note!==undefined&&(!note||note.length>1_000||sensitiveTextClasses(note).length>0))throw new CareerContinuityFeedbackValidationError();
  return{jobId,verdict:record.verdict,note};
}
export function computeCareerContinuityMetrics(items:CareerContinuityFeedback[]):CareerContinuityMetrics{const correct=items.filter(i=>i.verdict==='correct').length;const needsCorrection=items.length-correct;const accuracy=items.length?correct/items.length:0;const target=.8;return{total:items.length,correct,needsCorrection,accuracy,meetsTarget:items.length>=5&&accuracy>=target,target}}
export async function recordCareerContinuityFeedback(input:CareerContinuityFeedbackInput){const validated=validateCareerContinuityFeedback(input);const items=await read();const item:CareerContinuityFeedback={id:`career-feedback-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,jobId:validated.jobId,verdict:validated.verdict,note:validated.note,createdAt:new Date().toISOString()};items.push(item);await write(items.slice(-500));return item}
export async function careerContinuityMetrics():Promise<CareerContinuityMetrics>{return computeCareerContinuityMetrics(await read())}