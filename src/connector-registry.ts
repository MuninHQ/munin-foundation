import type { TrustedSourceSnapshot } from './trusted-source-radar.js';

export type ConnectorCategory='regulation'|'markets'|'career'|'communications'|'research';
export interface ConnectorRecord {id:string;name:string;category:ConnectorCategory;cost:'free';auth:'none'|'oauth';enabled:boolean;health:'healthy'|'degraded'|'not-connected'|'unknown';lastCheckedAt?:string;detail:string;}

export function connectorRegistry(radar:TrustedSourceSnapshot,connections:Array<{provider:string;connected:boolean}>):ConnectorRecord[]{
  const source:ConnectorRecord[]=radar.sources.map(item=>{const status=radar.status.find(value=>value.sourceId===item.id);return {id:item.id,name:item.name,category:'regulation',cost:'free',auth:'none',enabled:true,health:status?.ok?'healthy':status?'degraded':'unknown',lastCheckedAt:status?.fetchedAt,detail:status?.ok?`${status.count} sinais válidos`:(status?.error??'Ainda não verificado')};});
  const mail:ConnectorRecord[]=connections.map(item=>({id:item.provider,name:item.provider==='gmail'?'Gmail':'Outlook',category:'communications',cost:'free',auth:'oauth',enabled:item.connected,health:item.connected?'healthy':'not-connected',detail:item.connected?'Leitura autorizada':'OAuth não conectado'}));
  return [...source,...mail];
}
