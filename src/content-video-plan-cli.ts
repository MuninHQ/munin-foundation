import { buildContentVideoRenderManifest, type ContentVideoAspectRatio, type ContentVideoRenderer } from './content-video-pipeline.js';

const args=process.argv.slice(2);
function value(name:string):string|undefined{
 const prefix=`--${name}=`;
 return args.find(arg=>arg.startsWith(prefix))?.slice(prefix.length);
}
const topic=value('topic')??args.find(arg=>!arg.startsWith('--'));
if(!topic){
 console.error('Usage: npm run video:content:plan -- --topic="..." [--script="..."] [--aspect=9:16] [--renderer=ffmpeg-remotion]');
 process.exitCode=2;
}else{
 try{
  const aspect=(value('aspect')??'9:16') as ContentVideoAspectRatio;
  if(!['16:9','9:16','1:1'].includes(aspect))throw new Error('aspect must be 16:9, 9:16 or 1:1');
  const renderer=(value('renderer')??'ffmpeg-remotion') as ContentVideoRenderer;
  if(!['ffmpeg','ffmpeg-remotion'].includes(renderer))throw new Error('renderer must be ffmpeg or ffmpeg-remotion');
  const manifest=buildContentVideoRenderManifest({topic,script:value('script'),language:value('language'),aspectRatio:aspect,renderer,outputDir:value('output-dir')});
  console.log(JSON.stringify(manifest,null,2));
 }catch(error){
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
 }
}
