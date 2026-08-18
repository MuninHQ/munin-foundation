import assert from 'node:assert/strict';
import test from 'node:test';
import { LinuxSecretServiceOAuthTokenStore, MacOSKeychainOAuthTokenStore, platformSecureTokenStore, resolveSecureOAuthTokenStore } from '../src/oauth-token-store.js';

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

test('auto mode falls back when the host has no supported secure store',async()=>{
 assert.equal(platformSecureTokenStore('win32'),undefined);
 assert.equal(await resolveSecureOAuthTokenStore({mode:'auto',platform:'win32'}),undefined);
});

test('required keychain mode fails closed when unsupported',async()=>{
 await assert.rejects(resolveSecureOAuthTokenStore({mode:'keychain',platform:'win32'}),/not supported/);
});

test('auto mode uses a healthy native credential store',async()=>{
 const exec=async()=>({stdout:'',stderr:''});
 const store=await resolveSecureOAuthTokenStore({mode:'auto',platform:'darwin',exec});
 assert.equal(store?.kind,'macos-keychain');
});
