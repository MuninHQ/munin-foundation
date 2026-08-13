/**
 * Unified Munin API server.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleApi, startBackgroundJobs } from './api.js';
import { handleVisualAssets } from './visual-assets-api.js';
import { handleLinkedInComposer } from './linkedin-composer-api.js';
import { handleContextMemory } from './context-memory-api.js';
import { handleExecutiveBriefing } from './executive-briefing-api.js';
import { handleCareerIntelligence } from './career-intelligence-api.js';
import { handleCouncil } from './council-api.js';
import { apiPort } from './config.js';
type Handler=(request:IncomingMessage,response:ServerResponse)=>Promise<void>;
const routes:Array<[prefix:string,handler:Handler]>=[['/api/visual-assets',handleVisualAssets],['/api/linkedin-composer',handleLinkedInComposer],['/api/context-memory',handleContextMemory],['/api/executive-briefing',handleExecutiveBriefing],['/api/career-intelligence',handleCareerIntelligence],['/api/council',handleCouncil]];
export async function handleUnified(request:IncomingMessage,response:ServerResponse):Promise<void>{const pathname=new URL(request.url??'/','http://127.0.0.1').pathname;for(const[prefix,handler]of routes)if(pathname===prefix||pathname.startsWith(prefix+'/'))return handler(request,response);return handleApi(request,response)}
export function createUnifiedServer(){startBackgroundJobs();return createServer((request,response)=>void handleUnified(request,response))}
if(process.argv[1]?.endsWith('server.js')){const port=apiPort();createUnifiedServer().listen(port,'127.0.0.1',()=>console.log(`Munin API (unified) running at http://127.0.0.1:${port}`))}
