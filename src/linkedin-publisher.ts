import { readFile } from 'node:fs/promises';
import { runtimePath } from './config.js';
import { writeJsonAtomic } from './storage.js';
import { loadLinkedInContent } from './linkedin-content.js';

export type PublisherStatus='draft'|'approved'|'published'|'revoked';
export interface PublisherRecord{postId:string;status:PublisherStatus;approvedAt?:string;revokedAt?:string;publishedAt?:string;publishedUrl?:string;note?:string;updatedAt:string}
export interface PublisherPackage{postId:string;title:string;body:string;themes:string[];imagePrompt?:string;visualConcept?:string;status:PublisherStatus;approvedAt?:string;publicationBoundary:'manual-only'}
interface PublisherState{records:PublisherRecord[];updatedAt:string}

const file=()=>runtimePath('linkedin-publisher.json');
const empty=():PublisherState=>({records:[],updatedAt:new Date(0).toISOString()});
async function loadState():Promise<PublisherState>{try{const parsed=JSON.parse(await readFile(file(),'utf8')) as PublisherState;return {...empty(),...parsed,records:Array.isArray(parsed.records)?parsed.records:[]};}catch{return empty();}}
async function saveState(state:PublisherState){state.updatedAt=new Date().toISOString();await writeJsonAtomic(file(),state);return state;}
function now(){return new Date().toISOString();}
function recordFor(state:PublisherState,postId:string){let record=state.records.find(item=>item.postId===postId);if(!record){record={postId,status:'draft',updatedAt:now()};state.records.push(record);}return record;}
async function assertPost(postId:string){const content=await loadLinkedInContent();const post=content.posts.find(item=>item.id===postId);if(!post)throw new Error('LinkedIn post not found');return post;}

export async function publisherQueue(){const [content,state]=await Promise.all([loadLinkedInContent(),loadState()]);const byId=new Map(state.records.map(item=>[item.postId,item]));return content.posts.filter(post=>post.status!=='published'||byId.has(post.id)).map(post=>{const record=byId.get(post.id);return {postId:post.id,title:post.title,status:record?.status??(post.status==='published'?'published':'draft'),approvedAt:record?.approvedAt,publishedAt:record?.publishedAt??post.publishedAt,publishedUrl:record?.publishedUrl,themes:post.themes,updatedAt:record?.updatedAt??post.updatedAt};}).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}

export async function approveForPublication(postId:string,note?:string):Promise<PublisherRecord>{await assertPost(postId);const state=await loadState();const record=recordFor(state,postId);record.status='approved';record.approvedAt=now();record.revokedAt=undefined;record.note=note?.trim()||record.note;record.updatedAt=now();await saveState(state);return record;}
export async function revokePublicationApproval(postId:string,note?:string):Promise<PublisherRecord>{await assertPost(postId);const state=await loadState();const record=recordFor(state,postId);record.status='revoked';record.revokedAt=now();record.note=note?.trim()||record.note;record.updatedAt=now();await saveState(state);return record;}
export async function publicationPackage(postId:string):Promise<PublisherPackage>{const [post,state]=await Promise.all([assertPost(postId),loadState()]);const record=recordFor(state,postId);if(record.status!=='approved')throw new Error('Explicit approval is required before preparing a publication package');return {postId,title:post.title,body:post.body,themes:post.themes,imagePrompt:post.imagePrompt,visualConcept:post.visualConcept,status:record.status,approvedAt:record.approvedAt,publicationBoundary:'manual-only'};}
export async function markManuallyPublished(postId:string,input:{url:string;confirmation:string;note?:string}):Promise<PublisherRecord>{await assertPost(postId);if(input.confirmation!=='I_PUBLISHED_THIS_MANUALLY')throw new Error('Manual publication confirmation is required');let parsed:URL;try{parsed=new URL(input.url);}catch{throw new Error('A valid published URL is required');}if(!/^https?:$/.test(parsed.protocol))throw new Error('Published URL must use http or https');const state=await loadState();const record=recordFor(state,postId);if(record.status!=='approved')throw new Error('Post must be approved before it can be marked published');record.status='published';record.publishedAt=now();record.publishedUrl=parsed.toString();record.note=input.note?.trim()||record.note;record.updatedAt=now();await saveState(state);return record;}

export function publisherPolicy(){return {externalWriteAllowed:false,publicationBoundary:'manual-only' as const,approvalRequired:true,confirmation:'I_PUBLISHED_THIS_MANUALLY'};}
