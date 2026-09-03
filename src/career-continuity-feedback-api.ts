import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  CareerContinuityFeedbackValidationError,
  recordCareerContinuityFeedback,
  validateCareerContinuityFeedback,
  type CareerContinuityFeedback,
  type CareerContinuityFeedbackInput,
} from './career-continuity-validation.js';
import { JsonBodyValidationError, json, readJsonBody } from './http.js';
import { mobileAuthorized } from './mobile-api.js';
import { redactSecrets } from './secret-redaction.js';

type FeedbackRecorder=(input:CareerContinuityFeedbackInput)=>Promise<CareerContinuityFeedback>;

function isFeedbackRoute(request:IncomingMessage):boolean{
  try{return new URL(request.url??'/','http://127.0.0.1').pathname==='/api/mobile/career/feedback'}catch{return false}
}

const routeNotFound=(request:IncomingMessage,response:ServerResponse):void=>json(
  request,
  response,
  404,
  {error:'Career continuity feedback route not found',code:'CAREER_CONTINUITY_FEEDBACK_ROUTE_NOT_FOUND'},
);

export function createCareerContinuityFeedbackHandler(recorder:FeedbackRecorder=recordCareerContinuityFeedback){
  return async function handleCareerContinuityFeedbackApi(request:IncomingMessage,response:ServerResponse):Promise<void>{
    if(request.method==='OPTIONS')return json(request,response,204,{});
    if(!mobileAuthorized(request))return json(request,response,401,{error:'Unauthorized',code:'MOBILE_AUTH_REQUIRED'});
    if(request.method!=='POST'||!isFeedbackRoute(request))return routeNotFound(request,response);
    try{
      const input=validateCareerContinuityFeedback(await readJsonBody(request,2_000));
      const recorded=await recorder(input);
      return json(request,response,201,redactSecrets(recorded));
    }catch(error){
      if(error instanceof JsonBodyValidationError||error instanceof CareerContinuityFeedbackValidationError){
        return json(request,response,400,{error:'Invalid career continuity feedback',code:'CAREER_CONTINUITY_FEEDBACK_INVALID'});
      }
      return json(request,response,500,{error:'Internal server error',code:'INTERNAL_ERROR'});
    }
  };
}

export const handleCareerContinuityFeedbackApi=createCareerContinuityFeedbackHandler();
