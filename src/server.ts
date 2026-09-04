/**
 * Unified Munin API server.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleApi, startBackgroundJobs } from './api.js';
import { handleVisualAssets } from './visual-assets-api.js';
import { handleLinkedInComposer } from './linkedin-composer-api.js';
import { handleLinkedInPublisher } from './linkedin-publisher-api.js';
import { handleContextMemory } from './context-memory-api.js';
import { handleExecutiveBriefing } from './executive-briefing-api.js';
import { handleCareerIntelligence } from './career-intelligence-api.js';
import { handleCareerIntakeApi } from './career-intake-api.js';
import { handleCouncil } from './council-api.js';
import { handleOrchestration } from './orchestration-api.js';
import { handlePortfolio } from './portfolio-api.js';
import { handleMobileApi } from './mobile-api.js';
import { handleCareerMobileApi } from './career-mobile-api.js';
import { handleMemoryLedgerMobileApi } from './memory-ledger-mobile-api.js';
import { handleEngineeringApi } from './engineering-api.js';
import { handleDocumentMobileApi } from './document-mobile-api.js';
import { handleControlRoomApi } from './control-room-api.js';
import { handleHostMobileApi } from './host-mobile-api.js';
import { handleEmailIntelligence } from './email-intelligence-api.js';
import { handleEmailMobileApi } from './email-mobile-api.js';
import { handleAgentForgeApi } from './agent-forge-api.js';
import { handleAdaptiveFeedbackApi } from './adaptive-feedback-api.js';
import { handleViralEngineApi } from './viral-engine-api.js';
import { apiPort } from './config.js';
type Handler=(request:IncomingMessage,response:ServerResponse)=>Promise<void>;
const routes:Array<[prefix:string,handler:Handler]>=[['/api/viral-engine',handleViralEngineApi],['/api/adaptive',handleAdaptiveFeedbackApi],['/api/agent-forge',handleAgentForgeApi],['/api/orchestrate',handleControlRoomApi],['/api/mobile/email-intelligence',handleEmailMobileApi],['/api/mobile/host',handleHostMobileApi],['/api/mobile/memory-ledger',handleMemoryLedgerMobileApi],['/api/mobile/documents',handleDocumentMobileApi],['/api/mobile/engineering',handleEngineeringApi],['/api/mobile/career',handleCareerMobileApi],['/api/mobile',handleMobileApi],['/api/email-intelligence',handleEmailIntelligence],['/api/visual-assets',handleVisualAssets],['/api/linkedin-composer',handleLinkedInComposer],['/api/linkedin-publisher',handleLinkedInPublisher],['/api/second-brain',handleContextMemory],['/api/context-memory',handleContextMemory],['/api/executive-briefing',handleExecutiveBriefing],['/api/career-intelligence',handleCareerIntelligence],['/api/career-intake',handleCareerIntakeApi],['/api/council',handleCouncil],['/api/orchestration',handleOrchestration],['/api/portfolio',handlePortfolio]];
export async function handleUnified(request:IncomingMessage,response:ServerResponse):Promise<void>{const pathname=new URL(request.url??'/','http://127.0.0.1').pathname;for(const[prefix,handler]of routes)if(pathname===prefix||pathname.startsWith(prefix+'/'))return handler(request,response);return handleApi(request,response)}
export function createUnifiedServer(){startBackgroundJobs();return createServer((request,response)=>void handleUnified(request,response))}
if(process.argv[1]?.endsWith('server.js')){const port=apiPort();const host=process.env.MUNIN_API_HOST?.trim()||'127.0.0.1';createUnifiedServer().listen(port,host,()=>console.log(`Munin API (unified) running at http://${host}:${port}`))}
