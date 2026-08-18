import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';

export type ControlRoomState = {
 currentState: string;
 backlog: string;
 sessionLog: string;
 missing: string[];
};

export type SessionEvent = {
 title: string;
 summary: string;
 timestamp?: Date;
};

const STATE_PATHS={
 currentState:'ops/CURRENT_STATE.md',
 backlog:'ops/BACKLOG.md',
 sessionLog:'ops/SESSION_LOG.md'
} as const;

async function readOptional(root:string,relative:string):Promise<{content:string;missing:boolean}>{
 try{return {content:await readFile(path.join(root,relative),'utf8'),missing:false}}
 catch(error){
  if((error as NodeJS.ErrnoException).code==='ENOENT')return {content:'',missing:true};
  throw error;
 }
}

export async function hydrateControlRoomState(root=process.cwd()):Promise<ControlRoomState>{
 const [currentState,backlog,sessionLog]=await Promise.all([
  readOptional(root,STATE_PATHS.currentState),
  readOptional(root,STATE_PATHS.backlog),
  readOptional(root,STATE_PATHS.sessionLog)
 ]);
 const missing:string[]=[];
 if(currentState.missing)missing.push(STATE_PATHS.currentState);
 if(backlog.missing)missing.push(STATE_PATHS.backlog);
 if(sessionLog.missing)missing.push(STATE_PATHS.sessionLog);
 return {currentState:currentState.content,backlog:backlog.content,sessionLog:sessionLog.content,missing};
}

export async function appendSessionEvent(event:SessionEvent,root=process.cwd()):Promise<void>{
 const stamp=(event.timestamp??new Date()).toISOString();
 const block=`\n## ${stamp} — ${event.title}\n\n${event.summary.trim()}\n`;
 await appendFile(path.join(root,STATE_PATHS.sessionLog),block,'utf8');
}

export function summarizeHydratedState(state:ControlRoomState){
 return {
  ready:state.missing.length===0,
  missing:state.missing,
  currentStateBytes:Buffer.byteLength(state.currentState),
  backlogBytes:Buffer.byteLength(state.backlog),
  sessionLogBytes:Buffer.byteLength(state.sessionLog)
 };
}
