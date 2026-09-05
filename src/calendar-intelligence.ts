import { accessToken, connectionStatus } from './oauth.js';
import { buildInterviewWarRooms, type InterviewWarRoom } from './career-automation.js';

type GoogleCalendarEvent = {
  id:string; summary?:string; description?:string; location?:string; hangoutLink?:string;
  start?:{dateTime?:string;date?:string}; end?:{dateTime?:string;date?:string};
  attendees?:Array<{email?:string;displayName?:string}>;
};
type GoogleCalendarList = { items?:GoogleCalendarEvent[] };
export interface InterviewCalendarItem {
  eventId:string; title:string; start:string; end?:string; location?:string;
  meetLink?:string; attendees:string[]; warRoom?:InterviewWarRoom; matchScore:number;
}
export type CalendarSnapshot = {
  ready:boolean; items:InterviewCalendarItem[];
  reason?:'not-authorized'|'service-disabled';
};

function normalize(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function score(event:GoogleCalendarEvent,room:InterviewWarRoom){
  const text=normalize(`${event.summary??''} ${event.description??''} ${event.location??''}`);
  const company=normalize(room.company),tokens=normalize(room.role).split(/[^a-z0-9]+/).filter(t=>t.length>4);
  let total=company&&text.includes(company)?6:0;
  total+=tokens.filter(t=>text.includes(t)).length*1.5;
  if(/entrevista|interview|recruit|talent|hiring/.test(text))total+=3;
  return total;
}
export async function googleCalendarReady(){
  const gmail=(await connectionStatus()).find(x=>x.provider==='gmail');
  return Boolean(gmail?.connected&&gmail.scope?.includes('calendar.readonly'));
}

function mapEvents(data:GoogleCalendarList,rooms:InterviewWarRoom[]):InterviewCalendarItem[]{
  return (data.items??[]).map(event=>{
    const ranked=rooms.map(room=>({room,score:score(event,room)})).sort((a,b)=>b.score-a.score),best=ranked[0];
    return {eventId:event.id,title:event.summary??'(sem título)',start:event.start?.dateTime??event.start?.date??'',end:event.end?.dateTime??event.end?.date,location:event.location,meetLink:event.hangoutLink,attendees:(event.attendees??[]).map(a=>a.displayName??a.email??'').filter(Boolean),warRoom:best&&best.score>=4?best.room:undefined,matchScore:best?.score??0};
  }).filter(x=>x.warRoom||/entrevista|interview|recruit|talent|hiring/i.test(x.title));
}

export async function fetchInterviewCalendarSnapshot(daysAhead=30):Promise<CalendarSnapshot>{
  if(!(await googleCalendarReady()))return{ready:false,items:[],reason:'not-authorized'};
  const token=await accessToken('gmail'),now=new Date(),end=new Date(now.getTime()+daysAhead*86400000);
  const params=new URLSearchParams({singleEvents:'true',orderBy:'startTime',timeMin:now.toISOString(),timeMax:end.toISOString(),maxResults:'100'});
  const response=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,{headers:{authorization:`Bearer ${token}`}});
  if(!response.ok){
    const body=await response.text();
    if(response.status===403&&/(SERVICE_DISABLED|accessNotConfigured|Calendar API has not been used|is disabled)/i.test(body))return{ready:false,items:[],reason:'service-disabled'};
    throw new Error(`Google Calendar sync failed: ${response.status}`);
  }
  const data=JSON.parse(await response.text()) as GoogleCalendarList,rooms=await buildInterviewWarRooms();
  return{ready:true,items:mapEvents(data,rooms)};
}

export async function fetchInterviewCalendar(daysAhead=30):Promise<InterviewCalendarItem[]>{
  return (await fetchInterviewCalendarSnapshot(daysAhead)).items;
}
