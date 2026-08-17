'use client';
import { useEffect } from 'react';
export function PwaRegistrar(){
 useEffect(()=>{if(process.env.NODE_ENV!=='production'||!('serviceWorker'in navigator))return;const run=()=>navigator.serviceWorker.register('/opsiqo-sw.js',{scope:'/'}).catch(()=>undefined);if(document.readyState==='complete')void run();else window.addEventListener('load',run,{once:true})},[]);
 return null;
}
