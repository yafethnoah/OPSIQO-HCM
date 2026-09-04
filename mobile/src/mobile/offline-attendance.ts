import * as SecureStore from 'expo-secure-store';
import { ApiError, apiFetch } from '@/api/client';

const KEY='opsiqo.mobile.offline.attendance.v1';
const MAX_EVENTS=12;

export type OfflineClockEvent={
  id:string;
  orgId:string;
  action:'clock_in'|'clock_out';
  capturedAt:string;
  location:{
    latitude:number;
    longitude:number;
    accuracyMeters?:number;
    capturedAt:string;
    source:'offline_sync';
    deviceVerification:'none'|'native_biometric';
    integritySignals:string[];
  };
  queuedAt:string;
};

async function read():Promise<OfflineClockEvent[]>{
  const raw=await SecureStore.getItemAsync(KEY);
  if(!raw)return[];
  try{const rows=JSON.parse(raw);return Array.isArray(rows)?rows.slice(-MAX_EVENTS):[]}catch{return[]}
}
async function write(rows:OfflineClockEvent[]){
  if(!rows.length)return SecureStore.deleteItemAsync(KEY);
  await SecureStore.setItemAsync(KEY,JSON.stringify(rows.slice(-MAX_EVENTS)),{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});
}
export async function listOfflineClockEvents(){return read()}
export async function queueOfflineClockEvent(event:OfflineClockEvent){const rows=await read();if(rows.some(x=>x.id===event.id))return rows;rows.push(event);await write(rows);return rows}
export async function removeOfflineClockEvent(id:string){const rows=(await read()).filter(x=>x.id!==id);await write(rows);return rows}

export async function syncOfflineClockEvents(orgId:string){
  const rows=await read();
  const pending=rows.filter(x=>x.orgId===orgId);
  let synced=0;
  const failures:Array<{id:string;message:string;terminal:boolean}>=[];
  for(const event of pending){
    try{
      await apiFetch(`/api/organizations/${orgId}/time/clock`,{method:'POST',orgId,body:JSON.stringify({
        action:event.action,
        offlineEventId:event.id,
        clientCapturedAt:event.capturedAt,
        location:event.location,
      })});
      await removeOfflineClockEvent(event.id);synced++;
    }catch(error){
      const duplicate=error instanceof ApiError&&error.code==='offline_event_duplicate';
      if(duplicate){await removeOfflineClockEvent(event.id);synced++;continue;}
      const terminal=error instanceof ApiError&&error.status>=400&&error.status<500;
      failures.push({id:event.id,message:error instanceof Error?error.message:'Offline attendance synchronization failed.',terminal});
      if(!terminal)break;
    }
  }
  return{synced,remaining:(await read()).filter(x=>x.orgId===orgId).length,failures};
}
