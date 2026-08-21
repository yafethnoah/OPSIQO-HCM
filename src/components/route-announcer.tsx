'use client';
import { useEffect,useState } from 'react';
import { usePathname } from 'next/navigation';
function label(path:string){const leaf=path.split('/').filter(Boolean).pop()||'home';return leaf.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}
export function RouteAnnouncer(){const pathname=usePathname(),[message,setMessage]=useState('');useEffect(()=>{const id=window.setTimeout(()=>setMessage(`${label(pathname)} loaded`),80);return()=>window.clearTimeout(id)},[pathname]);return <div className="routeAnnouncer" role="status" aria-live="polite" aria-atomic="true">{message}</div>}
