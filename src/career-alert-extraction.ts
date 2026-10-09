import { createHash } from 'node:crypto';
import type { CareerEmail } from './career-inbox.js';
import { safeCareerLink } from './career-job-links.js';

export interface AlertVacancy { link: string; role?: string; company?: string; }
export interface AlertExtraction { vacancies: AlertVacancy[]; incomplete: boolean; }
const MAX_BODY = 500_000;
function entities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|\d+);/gi, value => {
    const named: Record<string, string> = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};
    if (named[value.toLowerCase()]) return named[value.toLowerCase()];
    const code = value.toLowerCase().startsWith('&#x') ? parseInt(value.slice(3,-1),16) : parseInt(value.slice(2,-1),10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}
function plain(text: string): string {
  return entities(text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/?(?:p|div|td|tr|br|li|h[1-6])\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,''))
    .split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}
function vacancyLink(raw: string): string | undefined {
  const link = safeCareerLink(entities(raw).replace(/[.,;)]+$/,''));
  if (!link) return undefined;
  const url = new URL(link);
  if (/(^|\.)linkedin\.com$/i.test(url.hostname)) return /^\/jobs\/view\/\d+\/?$/.test(url.pathname) ? link : undefined;
  return /\/(?:jobs?|careers?|apply|vagas?|positions?|oportunidades?)\/[^/?]+/i.test(url.pathname) ? link : undefined;
}
function identity(title: string): Pick<AlertVacancy,'role'|'company'> {
  if (!title || /^(?:apply(?: now)?|candidatar(?:-se)?|ver vaga|view job|see job|saiba mais)$/i.test(title)) return {};
  const match = title.match(/^(.+?)\s+(?:at|na empresa|@)\s+(.+)$/i);
  return match ? {role:match[1].trim().slice(0,160),company:match[2].trim().slice(0,160)} : {role:title.slice(0,160)};
}
/** Email-only extraction: never fetches or executes links, scripts or remote images. */
export function extractAlertVacancies(body: string, html = false): AlertExtraction {
  const truncated = body.length > MAX_BODY;
  const input = body.slice(0,MAX_BODY).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const vacancies = new Map<string,AlertVacancy>();
  if (html) {
    const anchors = [...input.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi)];
    for (let i=0;i<anchors.length;i++) {
      const anchor=anchors[i]; const link=vacancyLink(anchor[1]??anchor[2]); if(!link)continue;
      const details=identity(plain(anchor[3]));
      // Only an explicitly labelled company is trusted; nearby location/footer text is not identity.
      const end=(anchor.index??0)+anchor[0].length;
      const tail=plain(input.slice(end,Math.min(anchors[i+1]?.index??input.length,end+600)));
      const companyAnchor=anchors[i+1];
      const companyUrl=companyAnchor?safeCareerLink(entities(companyAnchor[1]??companyAnchor[2])):undefined;
      const labelledCompany=companyUrl&&/(^|\.)linkedin\.com$/i.test(new URL(companyUrl).hostname)&&/^\/company\/[^/]+/.test(new URL(companyUrl).pathname)&&(companyAnchor!.index??0)-end<600?plain(companyAnchor![3]):undefined;
      const company=details.company??labelledCompany??tail.match(/(?:^|\n)(?:company|empresa)\s*:\s*([^\n]+)/i)?.[1]?.trim();
      const previous=vacancies.get(link);
      vacancies.set(link,{link,role:previous?.role??details.role,company:previous?.company??company});
    }
  } else {
    const lines=plain(input).split('\n');
    for(let i=0;i<lines.length;i++) for(const match of lines[i].matchAll(/https:\/\/[^\s<>"']+/gi)) {
      const link=vacancyLink(match[0]);if(!link)continue;
      const title=lines[i].replace(match[0],'').trim()||lines[i-1]||'';
      const details=identity(title);
      const company=details.company??lines[i+1]?.match(/^(?:company|empresa)\s*:\s*(.+)$/i)?.[1]?.trim();
      const previous=vacancies.get(link);
      vacancies.set(link,{link,role:previous?.role??details.role,company:previous?.company??company});
    }
  }
  const items=[...vacancies.values()].slice(0,100);
  return {vacancies:items,incomplete:truncated||vacancies.size>100||!items.length||items.some(item=>!item.role||!item.company)};
}
/** Children are stable across syncs and independently importable using the existing inbox API. */
export function expandCareerAlert(message: CareerEmail, body: string, html=false): CareerEmail[] {
  const result=extractAlertVacancies(body,html);
  const parent={...message,alertExtraction:{count:result.vacancies.length,incomplete:result.incomplete}};
  if(!result.vacancies.length)return[parent];
  parent.linkedJobId=undefined;parent.suggestedStatus=undefined;
  const children=result.vacancies.map(item=>{
    const key=createHash('sha256').update(`${message.provider}:${message.providerMessageId}:${item.link}`).digest('hex').slice(0,24);
    return {...message,id:`alert-${key}`,providerMessageId:`${message.providerMessageId}:vacancy:${key}`,
      sourceEmailId:message.providerMessageId,subject:item.role??'Vaga para identificar',snippet:`${item.role??''}\n${item.company??''}\n${item.link}`,
      detectedRole:item.role,detectedCompany:item.company,linkedJobId:undefined,suggestedStatus:undefined,
      suggestedAction:'Confirmar empresa e requisitos antes de candidatar.',handled:true,attention:'noise' as const,needsAction:false};
  });
  return[parent,...children];
}

export function careerAlertHealth(messages: CareerEmail[]): {emails:number;vacancies:number;incomplete:number} {
  const parents=messages.filter(message=>message.category==='job_alert'&&!message.sourceEmailId);
  return {emails:parents.length,vacancies:parents.reduce((count,message)=>count+(message.alertExtraction?.count??0),0),
    incomplete:parents.filter(message=>!message.alertExtraction||message.alertExtraction.incomplete).length};
}
