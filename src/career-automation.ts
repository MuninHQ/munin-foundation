import { CareerInboxStore } from './career-inbox.js';
import { buildCareerBrief, buildCareerProcesses } from './career-intelligence.js';
import { ContextStore } from './store.js';
import type { JobOpportunity, JobStatus } from './types.js';

const rank: Record<JobStatus, number> = { discovered:0, investigating:1, applied:2, interview:3, offer:4, rejected:4, closed:5 };
const terminal = new Set<JobStatus>(['offer','rejected','closed']);

export interface CareerAutomationResult { applied:number; reviewed:number; skipped:number; jobIds:string[]; }
export interface InterviewWarRoom {
  jobId:string; company:string; role:string; status:JobStatus; recruiter?:string; hiringManager?:string;
  latestSignal?:string; nextAction?:string; processHistory:string[]; preparation:string[];
}

export async function runCareerAutomation(): Promise<CareerAutomationResult> {
  const context = new ContextStore(); const inboxStore = new CareerInboxStore();
  const state = await context.load(); const inbox = await inboxStore.load();
  const processes = buildCareerProcesses(state.jobs, inbox.messages);
  let applied=0, reviewed=0, skipped=0; const jobIds:string[]=[];
  for (const process of processes) {
    if (process.automation !== 'auto' || !process.suggestedStatus) { if(process.automation==='review') reviewed++; else skipped++; continue; }
    const job = state.jobs.find(j=>j.id===process.job.id); if(!job) { skipped++; continue; }
    if (rank[process.suggestedStatus] < rank[job.status]) { skipped++; continue; }
    const latest = inbox.messages.filter(m=>m.linkedJobId===job.id && m.suggestedStatus===process.suggestedStatus).sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt))[0];
    if (!latest || latest.handled) { skipped++; continue; }
    job.status = process.suggestedStatus; job.nextAction = process.suggestedAction ?? job.nextAction; job.updatedAt = latest.receivedAt;
    job.lastContactAt = latest.receivedAt;
    if (job.status==='applied' && !job.appliedAt) job.appliedAt=latest.receivedAt;
    if (job.status==='applied' || job.status==='interview') { const follow=new Date(latest.receivedAt); follow.setDate(follow.getDate()+7); job.followUpAt=follow.toISOString(); }
    if (terminal.has(job.status)) job.followUpAt=undefined;
    latest.handled=true; applied++; jobIds.push(job.id);
    await context.event('career.automated_stage', 'job', job.id, { status:job.status, sourceMessageId:latest.id, confidence:latest.confidence });
  }
  if(applied){await context.save(state);await inboxStore.save(inbox);}
  return {applied,reviewed,skipped,jobIds};
}

export async function careerCommandBrief() {
  const state = await new ContextStore().load(); const inbox = await new CareerInboxStore().load();
  return buildCareerBrief(state.jobs, inbox.messages);
}

export async function buildInterviewWarRooms(): Promise<InterviewWarRoom[]> {
  const state=await new ContextStore().load(); const inbox=await new CareerInboxStore().load(); const processes=buildCareerProcesses(state.jobs,inbox.messages);
  return processes.filter(p=>p.job.status==='interview'||p.suggestedStatus==='interview').map(p=>warRoom(p.job,p.signals.map(s=>`${s.at} · ${s.category} · ${s.subject}`),p.signals[0]?.subject,p.suggestedAction));
}
function warRoom(job:JobOpportunity,history:string[],latestSignal?:string,nextAction?:string):InterviewWarRoom{return{jobId:job.id,company:job.company,role:job.role,status:job.status,recruiter:job.recruiter,hiringManager:job.hiringManager,latestSignal,nextAction:nextAction??job.nextAction,processHistory:history.slice(0,10),preparation:[`Revisar tese de valor para ${job.company} e ${job.role}.`,'Selecionar 3 casos profissionais com resultado mensurável e ligação direta ao escopo da vaga.','Preparar respostas para estratégia de produto, execução, stakeholders e liderança.','Revisar perguntas sobre modelo de trabalho, escopo, senioridade, remuneração e próximos passos.','Confirmar horário, canal/local e nome dos entrevistadores antes da conversa.']};}
