import type { MuninState } from './effects';

export type MuninRuntimeEvent = {
  id:string;
  state:MuninState;
  at:number;
  label?:string;
};

export const MUNIN_STATE_EVENT = 'munin:state';

export function emitMuninState(state:MuninState,label?:string,id=crypto.randomUUID()):string{
  window.dispatchEvent(new CustomEvent<MuninRuntimeEvent>(MUNIN_STATE_EVENT,{detail:{id,state,at:Date.now(),label}}));
  return id;
}

export function classifyMuninRequest(path:string,method='GET'):MuninState{
  if(/\/api\/(radar|career-inbox\/sync|intelligence\/context)/.test(path))return 'searching';
  if(/\/api\/(assistant|sitrep|intelligence|proactive-operator)/.test(path))return 'thinking';
  if(method.toUpperCase()!=='GET')return 'executing';
  return 'thinking';
}
