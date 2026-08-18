import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);

export type OAuthTokenRecord={accessToken:string;refreshToken?:string;expiresAt:number;scope?:string};
export type OAuthTokenMap=Partial<Record<'gmail'|'outlook',OAuthTokenRecord>>;
export type OAuthTokenStoreMode='json'|'keychain'|'auto';
export type OAuthTokenStorageKind='local-runtime-json'|'macos-keychain'|'linux-secret-service';

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

async function defaultExec(file:string,args:string[],options?:{input?:string}){
 const result=await execFileAsync(file,args,{encoding:'utf8',input:options?.input});
 return{stdout:String(result.stdout??''),stderr:String(result.stderr??'')};
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
  const payload=JSON.stringify(tokens);
  await this.exec('security',['add-generic-password','-U','-s',SERVICE,'-a',ACCOUNT,'-w',payload]);
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
   if(/not found|No such secret|exit code 1/i.test(message))return{};
   throw error;
  }
 }
 async save(tokens:OAuthTokenMap):Promise<void>{
  await this.exec('secret-tool',['store','--label=Munin OAuth tokens','service',SERVICE,'account',ACCOUNT],{input:JSON.stringify(tokens)});
 }
}

export function platformSecureTokenStore(platform:NodeJS.Platform=process.platform,exec?:Exec):OAuthTokenStore|undefined{
 if(platform==='darwin')return new MacOSKeychainOAuthTokenStore(exec);
 if(platform==='linux')return new LinuxSecretServiceOAuthTokenStore(exec);
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
