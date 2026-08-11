'use client';

import { firebaseAppCheck, firebaseAuth } from '@/lib/firebase/client';
import { getToken as getAppCheckToken } from 'firebase/app-check';

const ORG_STORAGE_KEY = 'opsiqo.activeOrgId';
const defaultOrgId = () => process.env.NEXT_PUBLIC_OPSIQO_ORG_ID || process.env.NEXT_PUBLIC_OPSIQO_DEMO_ORG_ID || 'demo-org';

export function activeOrgId() {
  if (typeof window !== 'undefined') return window.localStorage.getItem(ORG_STORAGE_KEY) || defaultOrgId();
  return defaultOrgId();
}

export function setActiveOrgId(orgId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
  window.dispatchEvent(new CustomEvent('opsiqo:organization-changed', { detail: { orgId } }));
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('content-type', 'application/json');
  headers.set('x-org-id', activeOrgId());

  if (process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE !== 'true') {
    const appCheck=firebaseAppCheck();
    if(appCheck) headers.set('x-firebase-appcheck',(await getAppCheckToken(appCheck,false)).token);
    const user = firebaseAuth().currentUser;
    if (!user) throw new Error('Sign in required.');
    headers.set('authorization', `Bearer ${await user.getIdToken()}`);
  }

  const response = await fetch(path, { ...init, headers, cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error((payload as any)?.message || `Request failed (${response.status})`);
  return payload as T;
}

export async function apiDownload(path:string):Promise<{blob:Blob;fileName?:string}> {
  const headers=new Headers(); headers.set('x-org-id',activeOrgId());
  if(process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE!=='true'){
    const appCheck=firebaseAppCheck(); if(appCheck) headers.set('x-firebase-appcheck',(await getAppCheckToken(appCheck,false)).token);
    const user=firebaseAuth().currentUser; if(!user) throw new Error('Sign in required.'); headers.set('authorization',`Bearer ${await user.getIdToken()}`);
  }
  const response=await fetch(path,{headers,cache:'no-store'}); if(!response.ok){const p=await response.json().catch(()=>({}));throw new Error(p?.message||`Download failed (${response.status})`);} const disposition=response.headers.get('content-disposition')||''; const m=disposition.match(/filename="([^"]+)"/); return{blob:await response.blob(),fileName:m?.[1]};
}
