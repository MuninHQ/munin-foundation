import { llmProviderStatus } from './llm-provider.js';

export async function careerMobileCapabilities(){
 const provider=await llmProviderStatus();
 return {
  version:1,
  intake:{
   endpoint:'/api/mobile/career/intake',
   method:'POST',
   auth:'bearer',
   maxBodyBytes:8_000_000,
   sources:['share_sheet','url','screenshot','image','manual'],
   image:{
    supportedMimeTypes:['image/png','image/jpeg','image/jpg','image/webp'],
    maxDecodedBytes:6_000_000,
    transport:'base64-transient',
    durableStorage:false,
    visionReady:provider.enabled&&provider.supportsVision!==false,
    provider:provider.enabled&&provider.supportsVision!==false?provider.provider:undefined,
    model:provider.enabled&&provider.supportsVision!==false?provider.model:undefined,
   },
  },
  shortcuts:{
   ios:{
    contract:'munin-career-intake-v1',
    acceptedInputs:['url','text','image'],
    recommendedFlow:['Receive Share Sheet input','Convert image to base64 only when needed','POST intake payload','Discard transient image bytes','Show normalized opportunity result'],
   },
  },
 };
}
