export type ContentVideoAspectRatio='16:9'|'9:16'|'1:1';
export type ContentVideoRenderer='ffmpeg'|'ffmpeg-remotion';
export interface ContentVideoPipelineInput{topic:string;script?:string;language?:string;aspectRatio?:ContentVideoAspectRatio;renderer?:ContentVideoRenderer;outputDir?:string}
export interface ContentVideoStage{id:string;purpose:string;automatic:boolean;requires:string[]}
export interface ContentVideoRenderManifest{
 version:'money-printer-local-v1';
 topic:string;
 script?:string;
 language:string;
 aspectRatio:ContentVideoAspectRatio;
 dimensions:{width:number;height:number};
 fps:30;
 renderer:ContentVideoRenderer;
 outputDir?:string;
 stages:ContentVideoStage[];
 policy:{localOnly:true;automaticInstallAllowed:false;automaticPublishAllowed:false;paidDependencyRequired:false;humanApprovalRequired:true;transcriptionBackend:'configured-local-only'};
}

const DIMENSIONS:Record<ContentVideoAspectRatio,{width:number;height:number}>={
 '16:9':{width:1920,height:1080},
 '9:16':{width:1080,height:1920},
 '1:1':{width:1080,height:1080},
};

export function buildContentVideoRenderManifest(input:ContentVideoPipelineInput):ContentVideoRenderManifest{
 const topic=input.topic.trim();
 if(!topic)throw new Error('topic is required');
 const aspectRatio=input.aspectRatio??'9:16';
 const renderer=input.renderer??'ffmpeg-remotion';
 return{
  version:'money-printer-local-v1',
  topic,
  script:input.script?.trim()||undefined,
  language:input.language?.trim()||'pt-BR',
  aspectRatio,
  dimensions:DIMENSIONS[aspectRatio],
  fps:30,
  renderer,
  outputDir:input.outputDir,
  stages:[
   {id:'script',purpose:'Use the supplied script or stop at the external-intelligence/human boundary for drafting.',automatic:Boolean(input.script?.trim()),requires:[]},
   {id:'beats',purpose:'Split the approved script into ordered visual beats.',automatic:true,requires:['script']},
   {id:'assets',purpose:'Resolve local/free-license footage, stills or generated assets with provenance.',automatic:false,requires:['beats']},
   {id:'voice',purpose:'Resolve an approved local voice track; no paid TTS is required by the contract.',automatic:false,requires:['script']},
   {id:'captions',purpose:'Create timed captions from approved local transcript/timing evidence.',automatic:false,requires:['voice']},
   {id:'overlays',purpose:'Render captions, CTA and explanatory cards as an isolated overlay layer.',automatic:true,requires:['beats','captions']},
   {id:'render',purpose:'Composite ordered assets, voice and overlays locally with FFmpeg; Remotion is an optional overlay renderer.',automatic:true,requires:['assets','voice','overlays']},
   {id:'thumbnail',purpose:'Prepare a reviewable thumbnail frame/package without publishing.',automatic:true,requires:['render']},
   {id:'review',purpose:'Require human review before any public publication.',automatic:false,requires:['render','thumbnail']},
  ],
  policy:{localOnly:true,automaticInstallAllowed:false,automaticPublishAllowed:false,paidDependencyRequired:false,humanApprovalRequired:true,transcriptionBackend:'configured-local-only'},
 };
}
