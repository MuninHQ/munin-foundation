import { createHash, randomUUID } from 'node:crypto';
import { CareerInboxStore, classifyCareerEmail, type CareerEmail } from './career-inbox.js';
import { ContextStore } from './store.js';

export type CaptureFormat = 'eml' | 'text' | 'txt' | 'msg';
export interface CaptureInput { format: CaptureFormat; filename?: string; content: string; }

function unfold(raw:string):string { return raw.replace(/\r?\n[ \t]+/g,' '); }
function decodeQuotedPrintable(value:string):string { return value.replace(/=\r?\n/g,'').replace(/=([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))); }
function stripHtml(value:string):string { return value.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim(); }
function header(raw:string,name:string):string|undefined { const match=unfold(raw).match(new RegExp(`^${name}:\\s*(.+)$`,'im')); return match?.[1]?.trim(); }

export function parseCapturedMessage(input:CaptureInput):{subject:string;fromName?:string;fromEmail?:string;snippet:string;receivedAt:string;providerMessageId:string} {
  if(input.format==='msg') throw new Error('Arquivos .msg binários ainda não são lidos diretamente. No Outlook, salve a mensagem como .eml ou copie e cole o conteúdo.');
  const raw=input.content.trim(); if(!raw) throw new Error('Conteúdo vazio');
  let subject=input.filename?.replace(/\.(eml|txt)$/i,'')||'Mensagem importada'; let from=''; let receivedAt=new Date().toISOString(); let content=raw;
  if(input.format==='eml') {
    subject=header(raw,'Subject')||subject; from=header(raw,'From')||''; const date=header(raw,'Date'); if(date&&!Number.isNaN(Date.parse(date))) receivedAt=new Date(date).toISOString();
    const split=raw.search(/\r?\n\r?\n/); content=split>=0?raw.slice(split).trim():raw; const encoding=header(raw,'Content-Transfer-Encoding'); if(encoding?.toLowerCase().includes('quoted-printable')) content=decodeQuotedPrintable(content); if(/content-type:\s*text\/html/i.test(raw)) content=stripHtml(content);
  } else {
    const lines=raw.split(/\r?\n/); const maybeSubject=lines.find(line=>/^subject:/i.test(line)); const maybeFrom=lines.find(line=>/^from:/i.test(line)); if(maybeSubject) subject=maybeSubject.replace(/^subject:\s*/i,'').trim(); if(maybeFrom) from=maybeFrom.replace(/^from:\s*/i,'').trim();
  }
  const email=from.match(/<([^>]+)>/)?.[1]||from.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]; const name=from.replace(/<[^>]+>/,'').replace(email||'','').trim()||undefined;
  const providerMessageId=`capture-${createHash('sha256').update(`${subject}\n${from}\n${content}`).digest('hex').slice(0,24)}`;
  return {subject,fromName:name,fromEmail:email,snippet:content.replace(/\s+/g,' ').slice(0,1200),receivedAt,providerMessageId};
}

export async function captureCareerMessage(input:CaptureInput):Promise<{message:CareerEmail;added:boolean}> {
  const parsed=parseCapturedMessage(input); const jobs=(await new ContextStore().load()).jobs; const classified=classifyCareerEmail({subject:parsed.subject,snippet:parsed.snippet,fromEmail:parsed.fromEmail},jobs);
  const message:CareerEmail={id:randomUUID(),provider:'capture',providerMessageId:parsed.providerMessageId,fromName:parsed.fromName,receivedAt:parsed.receivedAt,handled:false,...classified,subject:parsed.subject,snippet:parsed.snippet,fromEmail:parsed.fromEmail};
  const result=await new CareerInboxStore().upsert([message]); return {message,added:result.added===1};
}
