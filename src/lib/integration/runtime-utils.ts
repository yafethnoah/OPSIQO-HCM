import type { IntegrationCircuitBreakerPolicy,IntegrationRuntimeState,IntegrationRetryPolicy } from '@/domain/integration-runtime';
import type { IntegrationFieldMapping } from '@/domain/integration';

export function getPath(input:unknown,path?:string):unknown{
  if(!path)return input;
  return path.split('.').filter(Boolean).reduce<unknown>((cur,key)=>{
    if(cur===null||cur===undefined||typeof cur!=='object')return undefined;
    if(Array.isArray(cur)&&/^\d+$/.test(key))return cur[Number(key)];
    return (cur as Record<string,unknown>)[key];
  },input);
}

function setPath(target:Record<string,unknown>,path:string,value:unknown){
  const parts=path.split('.').filter(Boolean);let cur=target;
  for(let i=0;i<parts.length;i++){
    const key=parts[i]!;
    if(i===parts.length-1){cur[key]=value;return;}
    const next=cur[key];
    if(!next||typeof next!=='object'||Array.isArray(next))cur[key]={};
    cur=cur[key] as Record<string,unknown>;
  }
}

function transform(value:unknown,kind:IntegrationFieldMapping['transform']){
  if(kind==='trim')return typeof value==='string'?value.trim():value;
  if(kind==='lowercase')return typeof value==='string'?value.toLowerCase():value;
  if(kind==='uppercase')return typeof value==='string'?value.toUpperCase():value;
  if(kind==='date_iso'){
    const d=new Date(String(value));return Number.isNaN(d.getTime())?value:d.toISOString();
  }
  if(kind==='number'){
    const n=Number(value);return Number.isFinite(n)?n:value;
  }
  return value;
}

export function applyFieldMappings(record:unknown,mappings:IntegrationFieldMapping[]){
  if(!mappings.length)return record;
  const out:Record<string,unknown>={};
  for(const m of mappings){
    const value=getPath(record,m.source);
    if(value===undefined){if(m.required)throw new Error(`Required mapped field ${m.source} is missing.`);continue;}
    setPath(out,m.target,transform(value,m.transform));
  }
  return out;
}

export function extractRecords(payload:unknown,recordsPath?:string):unknown[]{
  const value=getPath(payload,recordsPath);
  if(Array.isArray(value))return value;
  if(value===undefined||value===null)return [];
  return [value];
}

export function computeBackoff(policy:IntegrationRetryPolicy,attempt:number){
  const exp=policy.baseDelayMs*Math.pow(2,Math.max(0,attempt-1));
  return Math.min(policy.maxDelayMs,Math.round(exp));
}

export function canRetry(status:number|undefined,attempt:number,policy:IntegrationRetryPolicy){
  if(attempt>=policy.maxAttempts)return false;
  if(status===429)return policy.retryOn429;
  if(status!==undefined&&status>=500)return policy.retryOn5xx;
  return status===undefined;
}

export function circuitAllows(state:IntegrationRuntimeState|undefined,at=Date.now()){
  if(!state||state.circuitStatus==='closed')return true;
  if(state.circuitStatus==='half_open')return true;
  return !state.openUntil||new Date(state.openUntil).getTime()<=at;
}

export function nextFailureState(state:IntegrationRuntimeState|undefined,policy:IntegrationCircuitBreakerPolicy,code:string,message:string,ts:string):Pick<IntegrationRuntimeState,'circuitStatus'|'consecutiveFailures'|'openUntil'|'lastFailureAt'|'lastErrorCode'|'lastErrorMessage'> {
  const count=(state?.consecutiveFailures||0)+1;
  const open=count>=policy.failureThreshold;
  return {circuitStatus:open?'open':'closed',consecutiveFailures:count,openUntil:open?new Date(new Date(ts).getTime()+policy.resetAfterMs).toISOString():undefined,lastFailureAt:ts,lastErrorCode:code,lastErrorMessage:message};
}

export function nextSuccessState():Pick<IntegrationRuntimeState,'circuitStatus'|'consecutiveFailures'|'openUntil'|'lastSuccessAt'|'lastErrorCode'|'lastErrorMessage'>{
  return {circuitStatus:'closed',consecutiveFailures:0,openUntil:undefined,lastSuccessAt:new Date().toISOString(),lastErrorCode:undefined,lastErrorMessage:undefined};
}

export function nextScheduleAt(input:{cadence:'interval'|'daily';intervalMinutes?:number;dailyTimeUtc?:string},from=new Date()){
  if(input.cadence==='interval')return new Date(from.getTime()+Math.max(5,input.intervalMinutes||60)*60000).toISOString();
  const [h,m]=String(input.dailyTimeUtc||'00:00').split(':').map(Number);const n=new Date(from);n.setUTCSeconds(0,0);n.setUTCHours(h||0,m||0,0,0);if(n.getTime()<=from.getTime())n.setUTCDate(n.getUTCDate()+1);return n.toISOString();
}
