'use client';

import { useEffect } from 'react';

const OPSIQO_CACHE_PREFIX='opsiqo-static-';

async function clearLegacyOpsiQoServiceWorkers(){
  if(!('serviceWorker' in navigator))return;
  const registrations=await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration)=>{
        try{return new URL(registration.scope).origin===window.location.origin}catch{return false}
      })
      .map((registration)=>registration.unregister())
  );

  if('caches' in window){
    const keys=await caches.keys();
    await Promise.all(keys.filter((key)=>key.startsWith(OPSIQO_CACHE_PREFIX)).map((key)=>caches.delete(key)));
  }
}

export function PwaRegistrar(){
  useEffect(()=>{
    let cancelled=false;

    if(process.env.NODE_ENV!=='production'){
      // A service worker registered during a prior production/local-start run
      // can otherwise serve stale Next/Turbopack chunks to the dev server.
      // Development must always be network-authoritative.
      void clearLegacyOpsiQoServiceWorkers().then(()=>{
        if(!cancelled && navigator.serviceWorker?.controller){
          // The old controller remains attached until navigation. Reload once
          // after successful cleanup; sessionStorage prevents a loop.
          const key='opsiqo.dev-sw-cleanup-reload';
          if(!window.sessionStorage.getItem(key)){
            window.sessionStorage.setItem(key,'1');
            window.location.reload();
          }
        }else{
          window.sessionStorage.removeItem('opsiqo.dev-sw-cleanup-reload');
        }
      }).catch(()=>undefined);
      return()=>{cancelled=true};
    }

    if(!('serviceWorker' in navigator))return;
    const run=()=>navigator.serviceWorker.register('/opsiqo-sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>undefined);
    if(document.readyState==='complete')void run();
    else window.addEventListener('load',run,{once:true});
    return()=>{cancelled=true;window.removeEventListener('load',run)};
  },[]);
  return null;
}
