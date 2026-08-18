import { appendSessionEvent, hydrateControlRoomState, summarizeHydratedState } from './control-room-state.js';

const [, , command='hydrate', ...args]=process.argv;

if(command==='hydrate'){
 const state=await hydrateControlRoomState();
 process.stdout.write(`${JSON.stringify(summarizeHydratedState(state),null,2)}\n`);
 process.exitCode=state.missing.length===0?0:2;
}else if(command==='log'){
 const title=args[0];
 const summary=args.slice(1).join(' ');
 if(!title||!summary){
  console.error('Usage: control-room:state -- log <title> <summary>');
  process.exitCode=2;
 }else{
  await appendSessionEvent({title,summary});
  process.stdout.write('session-event-appended\n');
 }
}else{
 console.error(`Unknown command: ${command}`);
 process.exitCode=2;
}
