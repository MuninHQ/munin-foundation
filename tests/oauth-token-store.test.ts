import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LinuxSecretServiceOAuthTokenStore, MacOSKeychainOAuthTokenStore, WindowsDpapiOAuthTokenStore, platformSecureTokenStore, resolveSecureOAuthTokenStore } from '../src/oauth-token-store.js';

const tokens={gmail:{accessToken:'access-redacted',refreshToken:'refresh-redacted',expiresAt:123,scope:'gmail.readonly'}};

test('macOS keychain adapter stores and restores the complete token map',async()=>{
 let stored='';
 const calls:string[][]=[];
 const exec=async(file:string,args:string[])=>{
  calls.push([file,...args]);
  if(args[0]==='find-generic-password')return{stdout:stored,stderr:''};
  stored=args.at(-1)??'';
  return{stdout:'',stderr:''};
 };
 const store=new MacOSKeychainOAuthTokenStore(exec);
 await store.save(tokens);
 assert.deepEqual(await store.load(),tokens);
 assert.equal(calls.every(call=>call[0]==='security'),true);
});

test('Linux Secret Service adapter sends secrets over stdin, not argv',async()=>{
 let stored='';
 let storeArgs:string[]=[];
 const exec=async(_file:string,args:string[],options?:{input?:string})=>{
  if(args[0]==='lookup')return{stdout:stored,stderr:''};
  storeArgs=args;
  stored=options?.input??'';
  return{stdout:'',stderr:''};
 };
 const store=new LinuxSecretServiceOAuthTokenStore(exec);
 await store.save(tokens);
 assert.equal(storeArgs.includes(JSON.stringify(tokens)),false);
 assert.deepEqual(await store.load(),tokens);
});

test('Windows DPAPI adapter encrypts token JSON through stdin and restores it for the current user',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-dpapi-'));const encryptedFile=path.join(dir,'tokens.dpapi');
 const calls:Array<{file:string;args:string[];input?:string}>=[];
 const exec=async(file:string,args:string[],options?:{input?:string})=>{
  calls.push({file,args,input:options?.input});
  const script=args.at(-1)??'';
  if(script.includes('ProtectedData]::Protect'))return{stdout:Buffer.from(options?.input??'','utf8').toString('base64'),stderr:''};
  if(script.includes('ProtectedData]::Unprotect'))return{stdout:Buffer.from(options?.input??'','base64').toString('utf8'),stderr:''};
  throw new Error('unexpected DPAPI command');
 };
 try{
  const store=new WindowsDpapiOAuthTokenStore(exec,encryptedFile);
  assert.deepEqual(await store.load(),{});
  await store.save(tokens);
  assert.deepEqual(await store.load(),tokens);
  assert.equal(calls.every(call=>call.file==='powershell.exe'),true);
  assert.equal(calls.some(call=>call.args.includes(JSON.stringify(tokens))),false);
  assert.equal(calls.some(call=>call.input===JSON.stringify(tokens)),true);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('auto mode now selects Windows DPAPI when the current-user protection provider is healthy',async()=>{
 const exec=async(_file:string,args:string[],options?:{input?:string})=>{
  const script=args.at(-1)??'';
  if(script.includes('ProtectedData]::Protect'))return{stdout:Buffer.from(options?.input??'','utf8').toString('base64'),stderr:''};
  if(script.includes('ProtectedData]::Unprotect'))return{stdout:Buffer.from(options?.input??'','base64').toString('utf8'),stderr:''};
  return{stdout:'',stderr:''};
 };
 const store=await resolveSecureOAuthTokenStore({mode:'auto',platform:'win32',exec});
 assert.equal(store?.kind,'windows-dpapi');
 assert.equal(platformSecureTokenStore('win32',exec)?.kind,'windows-dpapi');
});

test('required keychain mode fails closed when a secure provider is unavailable',async()=>{
 const exec=async()=>{throw new Error('powershell unavailable')};
 await assert.rejects(resolveSecureOAuthTokenStore({mode:'keychain',platform:'win32',exec}),/windows-dpapi is unavailable/);
});

test('auto mode uses a healthy native credential store',async()=>{
 const exec=async()=>({stdout:'',stderr:''});
 const store=await resolveSecureOAuthTokenStore({mode:'auto',platform:'darwin',exec});
 assert.equal(store?.kind,'macos-keychain');
});
