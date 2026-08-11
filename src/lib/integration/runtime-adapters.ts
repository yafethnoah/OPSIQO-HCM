import { createHmac,timingSafeEqual } from 'node:crypto';
import type { IntegrationConnector,IntegrationContract } from '@/domain/integration';
import type { IntegrationAdapterProfile,IntegrationRuntimeState } from '@/domain/integration-runtime';
import { adminBucket } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { validateIntegrationEndpoint } from './endpoint-security';
import { resolveSecretReference } from './secret-provider';
import { applyFieldMappings,canRetry,computeBackoff,extractRecords,getPath } from './runtime-utils';

export interface InboundAdapterResult {records:unknown[];cursor?:string;etag?:string;scimStartIndex?:number;statusCode?:number;}
export interface OutboundAdapterResult {accepted:number;statusCode?:number;responseHashInput?:string;}
export interface SftpRuntimeProvider {
  probe(input:{connector:IntegrationConnector;profile:IntegrationAdapterProfile}):Promise<void>;
  downloadJson(input:{connector:IntegrationConnector;profile:IntegrationAdapterProfile;secret:string|undefined}):Promise<unknown>;
  uploadJson(input:{connector:IntegrationConnector;profile:IntegrationAdapterProfile;secret:string|undefined;payload:unknown}):Promise<void>;
}
let sftpProvider:SftpRuntimeProvider|undefined;
export function registerSftpRuntimeProvider(provider:SftpRuntimeProvider){sftpProvider=provider;}
export function hasSftpRuntimeProvider(){return Boolean(sftpProvider);}

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const MAX_HTTP_BODY_BYTES=5*1024*1024;
async function readBoundedText(res:Response,maxBytes=MAX_HTTP_BODY_BYTES){
  const declared=Number(res.headers.get('content-length')||0);if(Number.isFinite(declared)&&declared>maxBytes)throw new ApiError(413,'Integration HTTP response exceeds the governed body limit.','integration_response_too_large');
  if(!res.body)return '';
  const reader=res.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new ApiError(413,'Integration HTTP response exceeds the governed body limit.','integration_response_too_large')}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}
  return Buffer.concat(chunks.map(v=>Buffer.from(v))).toString('utf8');
}
function safeHeaders(staticHeaders:Record<string,string>){const h=new Headers();for(const[k,v]of Object.entries(staticHeaders||{})){const n=k.toLowerCase();if(['authorization','proxy-authorization','cookie','set-cookie','x-api-key','host','content-length','connection','transfer-encoding','upgrade'].includes(n))throw new ApiError(400,`Header ${k} must come from secretRef, not staticHeaders.`,'secret_header_prohibited');h.set(k,v);}h.set('accept','application/json');return h;}

async function authHeaders(connector:IntegrationConnector){
  const h=new Headers();
  if(connector.authMode==='none')return h;
  const secret=await resolveSecretReference(connector.secretRef);
  if(!secret)throw new ApiError(503,'Connector secret is unavailable.','secret_not_available');
  if(connector.authMode==='bearer')h.set('authorization',`Bearer ${secret}`);
  else if(connector.authMode==='api_key')h.set('x-api-key',secret);
  else if(connector.authMode==='basic')h.set('authorization',`Basic ${Buffer.from(secret).toString('base64')}`);
  else if(connector.authMode==='oauth2_client_credentials'){
    let cfg:{tokenUrl?:string;clientId?:string;clientSecret?:string;scope?:string};try{cfg=JSON.parse(secret)}catch{throw new ApiError(503,'OAuth secret must be a server-side JSON object with tokenUrl, clientId and clientSecret.','invalid_oauth_secret')}
    if(!cfg.tokenUrl||!cfg.clientId||!cfg.clientSecret)throw new ApiError(503,'OAuth secret is missing tokenUrl/clientId/clientSecret.','invalid_oauth_secret');
    await validateIntegrationEndpoint(cfg.tokenUrl);
    const body=new URLSearchParams({grant_type:'client_credentials'});if(cfg.scope)body.set('scope',cfg.scope);
    const token=await fetch(cfg.tokenUrl,{method:'POST',headers:{authorization:`Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body,signal:AbortSignal.timeout(Math.min(connector.timeoutMs,30000))});
    if(!token.ok)throw new ApiError(502,`OAuth token exchange failed with HTTP ${token.status}.`,'oauth_token_exchange_failed');
    let j:{access_token?:string;token_type?:string};try{j=JSON.parse(await readBoundedText(token,256*1024)) as{access_token?:string;token_type?:string}}catch(e){if(e instanceof ApiError)throw e;throw new ApiError(502,'OAuth token response was not valid bounded JSON.','oauth_token_invalid')}if(!j.access_token)throw new ApiError(502,'OAuth token response did not contain access_token.','oauth_token_missing');h.set('authorization',`${j.token_type||'Bearer'} ${j.access_token}`);
  }else if(connector.authMode==='hmac_secret')throw new ApiError(409,'hmac_secret is reserved for signed inbound webhook verification.','hmac_auth_transport_invalid');
  else if(connector.authMode==='mtls')throw new ApiError(503,'mTLS connectors require a deployment transport provider; native fetch credentials are not configured by this build.','mtls_provider_required');
  return h;
}

async function request(connector:IntegrationConnector,profile:IntegrationAdapterProfile,url:URL,init:RequestInit){
  await validateIntegrationEndpoint(url.toString());
  let last:unknown;let lastStatus:number|undefined;
  for(let attempt=1;attempt<=profile.retryPolicy.maxAttempts;attempt++){
    try{
      const res=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(connector.timeoutMs)});lastStatus=res.status;
      if(res.ok)return res;
      if(!canRetry(res.status,attempt,profile.retryPolicy))throw new ApiError(502,`Integration endpoint returned HTTP ${res.status}.`,'integration_http_error');
      last=new Error(`HTTP ${res.status}`);
    }catch(e){last=e;if(e instanceof ApiError)throw e;if(!canRetry(undefined,attempt,profile.retryPolicy))throw e;}
    if(attempt<profile.retryPolicy.maxAttempts)await sleep(computeBackoff(profile.retryPolicy,attempt));
  }
  throw new ApiError(502,last instanceof Error?last.message:`Integration transport failed${lastStatus?` with HTTP ${lastStatus}`:''}.`,'integration_transport_failed');
}

function resourceUrl(connector:IntegrationConnector,profile:IntegrationAdapterProfile,state?:IntegrationRuntimeState){
  if(!connector.baseUrl)throw new ApiError(409,'Runtime HTTP connector requires baseUrl.','base_url_required');
  if(profile.resourcePath&&(profile.resourcePath.includes('://')||profile.resourcePath.startsWith('//')))throw new ApiError(400,'Adapter resourcePath must be relative to connector baseUrl.','absolute_resource_path_prohibited');
  const baseRoot=new URL(connector.baseUrl.endsWith('/')?connector.baseUrl:`${connector.baseUrl}/`),url=new URL(profile.resourcePath||'',baseRoot);
  if(url.origin!==baseRoot.origin)throw new ApiError(400,'Adapter resourcePath cannot change the approved connector origin.','resource_origin_mismatch');
  const rootPath=baseRoot.pathname.endsWith('/')?baseRoot.pathname:`${baseRoot.pathname}/`;if(profile.resourcePath&& !url.pathname.startsWith(rootPath))throw new ApiError(400,'Adapter resourcePath cannot escape the approved connector base path.','resource_path_escape');
  if(profile.deltaMode==='cursor'&&state?.cursor&&profile.cursorParam)url.searchParams.set(profile.cursorParam,state.cursor);
  if(profile.deltaMode==='scim_start_index'){
    url.searchParams.set('startIndex',String(state?.scimStartIndex||1));
    url.searchParams.set('count',String(Math.min(connector.maxBatchSize,1000)));
  }
  return url;
}

export async function pullInbound(connector:IntegrationConnector,contract:IntegrationContract,profile:IntegrationAdapterProfile,state?:IntegrationRuntimeState):Promise<InboundAdapterResult>{
  if(!['rest_pull','scim_users','scim_groups','file_json','sftp_json'].includes(profile.adapterKind))throw new ApiError(409,'This adapter profile is not an inbound pull transport.','adapter_direction_invalid');
  let payload:unknown;let etag:string|undefined;let statusCode:number|undefined;
  if(profile.adapterKind==='file_json'){
    const path=profile.fileObjectPath||'';
    if(!path.startsWith(`integrations/${connector.id}/inbound/`)||path.includes('..'))throw new ApiError(400,`File adapter object path must remain under integrations/${connector.id}/inbound/.`,'invalid_file_object_path');
    const file=adminBucket().file(path);const [exists]=await file.exists();if(!exists)throw new ApiError(404,'Configured inbound integration file does not exist.','integration_file_not_found');
    const [meta]=await file.getMetadata();if(Number(meta.size||0)>5*1024*1024)throw new ApiError(413,'Integration file exceeds the 5 MB governed runtime limit.','integration_file_too_large');
    const [buf]=await file.download();payload=JSON.parse(buf.toString('utf8'));etag=String(meta.generation||meta.etag||'');
    if(profile.deltaMode==='etag'&&state?.etag&&etag===state.etag)return{records:[],etag,statusCode:304};
  }else if(profile.adapterKind==='sftp_json'){
    if(!sftpProvider)throw new ApiError(503,'SFTP adapter profile is configured but no deployment SFTP runtime provider is registered.','sftp_provider_required');
    payload=await sftpProvider.downloadJson({connector,profile,secret:await resolveSecretReference(connector.secretRef)});
  }else{
    const url=resourceUrl(connector,profile,state),headers=safeHeaders(profile.staticHeaders);for(const[k,v]of (await authHeaders(connector)).entries())headers.set(k,v);if(profile.deltaMode==='etag'&&state?.etag)headers.set('if-none-match',state.etag);
    const res=await request(connector,profile,url,{method:'GET',headers});statusCode=res.status;etag=res.headers.get('etag')||undefined;if(res.status===304)return{records:[],etag,statusCode};
    const contentType=res.headers.get('content-type')||'';if(!contentType.includes('json'))throw new ApiError(502,'Integration endpoint did not return JSON.','non_json_response');
    try{payload=JSON.parse(await readBoundedText(res))}catch(e){if(e instanceof ApiError)throw e;throw new ApiError(502,'Integration endpoint returned invalid JSON.','invalid_json_response')}
  }
  const raw=profile.adapterKind.startsWith('scim_')?extractRecords(payload,profile.recordsPath||'Resources'):extractRecords(payload,profile.recordsPath);
  const records=raw.slice(0,connector.maxBatchSize).map(r=>applyFieldMappings(r,contract.fieldMappings));
  let cursor:string|undefined;if(profile.deltaMode==='cursor'&&profile.cursorPath){const c=getPath(payload,profile.cursorPath);if(c!==undefined&&c!==null)cursor=String(c);}
  let scimStartIndex:number|undefined;if(profile.deltaMode==='scim_start_index'){
    const total=Number(getPath(payload,'totalResults')||0),start=Number(getPath(payload,'startIndex')||state?.scimStartIndex||1),items=Number(getPath(payload,'itemsPerPage')||records.length);scimStartIndex=start+items<=total?start+items:1;
  }
  return{records,cursor,etag,scimStartIndex,statusCode};
}

export async function pushOutbound(connector:IntegrationConnector,profile:IntegrationAdapterProfile,records:unknown[]):Promise<OutboundAdapterResult>{
  const serialized=JSON.stringify(records);if(Buffer.byteLength(serialized,'utf8')>MAX_HTTP_BODY_BYTES)throw new ApiError(413,'Outbound integration payload exceeds the governed 5 MB runtime limit.','integration_payload_too_large');
  if(profile.adapterKind.startsWith('scim_')&&records.length!==1)throw new ApiError(409,'v3.2 SCIM outbound execution requires exactly one staged resource per run; SCIM Bulk is not implemented by this adapter.','scim_bulk_not_implemented');
  if(!['rest_push','scim_users','scim_groups','file_json','sftp_json'].includes(profile.adapterKind))throw new ApiError(409,'This adapter profile is not an outbound push transport.','adapter_direction_invalid');
  if(profile.adapterKind==='file_json'){
    const base=profile.fileObjectPath||`integrations/${connector.id}/outbound/`;
    if(!base.startsWith(`integrations/${connector.id}/outbound/`)||base.includes('..'))throw new ApiError(400,`File adapter output path must remain under integrations/${connector.id}/outbound/.`,'invalid_file_object_path');
    const path=base.endsWith('.json')?base:`${base.replace(/\/$/,'')}/${Date.now()}.json`;await adminBucket().file(path).save(JSON.stringify(records),{contentType:'application/json',resumable:false,metadata:{cacheControl:'no-store'}});return{accepted:records.length,statusCode:201,responseHashInput:path};
  }
  if(profile.adapterKind==='sftp_json'){
    if(!sftpProvider)throw new ApiError(503,'SFTP adapter profile is configured but no deployment SFTP runtime provider is registered.','sftp_provider_required');
    await sftpProvider.uploadJson({connector,profile,secret:await resolveSecretReference(connector.secretRef),payload:records});return{accepted:records.length,statusCode:200};
  }
  const url=resourceUrl(connector,profile),headers=safeHeaders(profile.staticHeaders);for(const[k,v]of (await authHeaders(connector)).entries())headers.set(k,v);headers.set('content-type','application/json');
  const payload=profile.adapterKind.startsWith('scim_')&&records.length===1?records[0]:records;
  const body=JSON.stringify(payload);if(Buffer.byteLength(body,'utf8')>MAX_HTTP_BODY_BYTES)throw new ApiError(413,'Outbound integration payload exceeds the governed 5 MB runtime limit.','integration_payload_too_large');
  const res=await request(connector,profile,url,{method:profile.requestMethod,headers,body});if(!res.ok)throw new ApiError(502,`Outbound integration returned HTTP ${res.status}.`,'outbound_transport_failed');return{accepted:records.length,statusCode:res.status};
}

export function verifyWebhookSignature(secret:string,timestamp:string,body:string,signature:string){
  const expected=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');const provided=signature.trim().toLowerCase().replace(/^sha256=/,'');if(!/^[a-f0-9]{64}$/.test(provided))return false;const a=Buffer.from(expected,'hex'),b=Buffer.from(provided,'hex');return a.length===b.length&&timingSafeEqual(a,b);
}
