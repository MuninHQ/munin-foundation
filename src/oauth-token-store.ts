import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './config.js';

export type OAuthTokenRecord={accessToken:string;refreshToken?:string;expiresAt:number;scope?:string};
export type OAuthTokenMap=Partial<Record<'gmail'|'outlook',OAuthTokenRecord>>;
export type OAuthTokenStoreMode='json'|'keychain'|'auto';
export type OAuthTokenStorageKind='local-runtime-json'|'macos-keychain'|'linux-secret-service'|'windows-dpapi';

export interface OAuthTokenStore{
 readonly kind:OAuthTokenStorageKind;
 load():Promise<OAuthTokenMap>;
 save(tokens:OAuthTokenMap):Promise<void>;
}

type Exec=(file:string,args:string[],options?:{input?:string})=>Promise<{stdout:string;stderr:string}>;

const SERVICE='munin.oauth';
const ACCOUNT='tokens';

function normalizeMode(value:string|undefined):OAuthTokenStoreMode{
 if(value==='json'||value==='keychain'||value==='auto')return value;
 return 'auto';
}

export function configuredOAuthTokenStoreMode():OAuthTokenStoreMode{
 return normalizeMode(process.env.MUNIN_OAUTH_TOKEN_STORE);
}

async function defaultExec(file:string,args:string[],options?:{input?:string}):Promise<{stdout:string;stderr:string}>{
 return new Promise((resolve,reject)=>{
  const child=spawn(file,args,{stdio:['pipe','pipe','pipe'],windowsHide:true,shell:false});
  let stdout='',stderr='';
  child.stdout.setEncoding('utf8').on('data',chunk=>{stdout+=chunk});
  child.stderr.setEncoding('utf8').on('data',chunk=>{stderr+=chunk});
  child.on('error',reject);
  child.on('close',code=>{
   if(code===0)return resolve({stdout,stderr});
   const error=Object.assign(new Error(`${file} exited with code ${code}`),{code,stdout,stderr});
   reject(error);
  });
  if(options?.input!==undefined)child.stdin.write(options.input);
  child.stdin.end();
 });
}

export class MacOSKeychainOAuthTokenStore implements OAuthTokenStore{
 readonly kind='macos-keychain' as const;
 constructor(private readonly exec:Exec=defaultExec){}
 async load():Promise<OAuthTokenMap>{
  try{
   const {stdout}=await this.exec('security',['find-generic-password','-s',SERVICE,'-a',ACCOUNT,'-w']);
   return stdout.trim()?JSON.parse(stdout.trim()) as OAuthTokenMap:{};
  }catch(error:any){
   if(String(error?.stderr??error?.message??'').match(/could not be found|SecKeychainSearchCopyNext|The specified item could not be found/i))return{};
   throw error;
  }
 }
 async save(tokens:OAuthTokenMap):Promise<void>{
  await this.exec('security',['add-generic-password','-U','-s',SERVICE,'-a',ACCOUNT,'-w',JSON.stringify(tokens)]);
 }
}

export class LinuxSecretServiceOAuthTokenStore implements OAuthTokenStore{
 readonly kind='linux-secret-service' as const;
 constructor(private readonly exec:Exec=defaultExec){}
 async load():Promise<OAuthTokenMap>{
  try{
   const {stdout}=await this.exec('secret-tool',['lookup','service',SERVICE,'account',ACCOUNT]);
   return stdout.trim()?JSON.parse(stdout.trim()) as OAuthTokenMap:{};
  }catch(error:any){
   const message=String(error?.stderr??error?.message??'');
   if(/not found|No such secret|exited with code 1/i.test(message))return{};
   throw error;
  }
 }
 async save(tokens:OAuthTokenMap):Promise<void>{
  await this.exec('secret-tool',['store','--label=Munin OAuth tokens','service',SERVICE,'account',ACCOUNT],{input:JSON.stringify(tokens)});
 }
}

const DPAPI_ENCRYPT_SCRIPT=`$plain=[Console]::In.ReadToEnd();$bytes=[System.Text.Encoding]::UTF8.GetBytes($plain);$protected=[System.Security.Cryptography.ProtectedData]::Protect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($protected))`;
const DPAPI_DECRYPT_SCRIPT=`$cipher=[Console]::In.ReadToEnd().Trim();$bytes=[Convert]::FromBase64String($cipher);$plain=[System.Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($plain))`;

export class WindowsDpapiOAuthTokenStore implements OAuthTokenStore{
 readonly kind='windows-dpapi' as const;
 constructor(private readonly exec:Exec=defaultExec,private readonly encryptedFile=path.join(dataDir(),'oauth.tokens.dpapi')){}
 private async protect(plain:string){const {stdout}=await this.exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',DPAPI_ENCRYPT_SCRIPT],{input:plain});if(!stdout.trim())throw new Error('Windows DPAPI returned an empty ciphertext');return stdout.trim();}
 private async unprotect(cipher:string){const {stdout}=await this.exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',DPAPI_DECRYPT_SCRIPT],{input:cipher});return stdout;}
 async load():Promise<OAuthTokenMap>{
  let cipher:string;
  try{cipher=(await readFile(this.encryptedFile,'utf8')).trim();}catch(error:any){
   if(error?.code!=='ENOENT')throw error;
   const probe=await this.protect('{}');const plain=await this.unprotect(probe);if(plain.trim()!=='{}')throw new Error('Windows DPAPI round-trip probe failed');return{};
  }
  if(!cipher)return{};
  const plain=await this.unprotect(cipher);return plain.trim()?JSON.parse(plain) as OAuthTokenMap:{};
 }
 async save(tokens:OAuthTokenMap):Promise<void>{
  const cipher=await this.protect(JSON.stringify(tokens));await mkdir(path.dirname(this.encryptedFile),{recursive:true});await writeFile(this.encryptedFile,cipher,{encoding:'utf8',mode:0o600});
 }
}

export function platformSecureTokenStore(platform:NodeJS.Platform=process.platform,exec?:Exec):OAuthTokenStore|undefined{
 if(platform==='darwin')return new MacOSKeychainOAuthTokenStore(exec);
 if(platform==='linux')return new LinuxSecretServiceOAuthTokenStore(exec);
 if(platform==='win32')return new WindowsDpapiOAuthTokenStore(exec);
 return undefined;
}

export async function secureTokenStoreAvailable(store:OAuthTokenStore):Promise<boolean>{
 try{await store.load();return true}catch{return false}
}

export async function resolveSecureOAuthTokenStore(options:{mode?:OAuthTokenStoreMode;platform?:NodeJS.Platform;exec?:Exec}={}):Promise<OAuthTokenStore|undefined>{
 const mode=options.mode??configuredOAuthTokenStoreMode();
 if(mode==='json')return undefined;
 const store=platformSecureTokenStore(options.platform??process.platform,options.exec);
 if(!store){
  if(mode==='keychain')throw new Error(`MUNIN_OAUTH_TOKEN_STORE=keychain is not supported on ${options.platform??process.platform}`);
  return undefined;
 }
 if(await secureTokenStoreAvailable(store))return store;
 if(mode==='keychain')throw new Error(`Secure OAuth token store ${store.kind} is unavailable`);
 return undefined;
}
