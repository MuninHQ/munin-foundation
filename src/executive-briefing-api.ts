import { createServer,type IncomingMessage,type ServerResponse } from 'node:http';
import { buildExecutiveBriefing,buildExecutiveBriefingText } from './executive-briefing.js';
import { json } from './http.js';
export async function handleExecutiveBriefing(req:IncomingMessage,res:ServerResponse){if(req.method==='OPTIONS')return json(req,res,204,{});const url=new URL(req.url??'/','http://127.0.0.1');try{if(req.method==='GET'&&url.pathname==='/api/executive-briefing')return json(req,res,200,await buildExecutiveBriefing());if(req.method==='GET'&&url.pathname==='/api/executive-briefing/text')return json(req,res,200,{report:await buildExecutiveBriefingText()});return json(req,res,404,{error:'Not found'});}catch(error){return json(req,res,400,{error:error instanceof Error?error.message:String(error)});}}
export function createExecutiveBriefingServer(){return createServer((req,res)=>void handleExecutiveBriefing(req,res));}
if(process.argv[1]?.endsWith('executive-briefing-api.js')){const port=Number(process.env.MUNIN_EXECUTIVE_BRIEFING_PORT??4315);createExecutiveBriefingServer().listen(port,'127.0.0.1',()=>console.log(`Munin Executive Briefing API running at http://127.0.0.1:${port}`));}
