'use client';
import { useEffect } from 'react';
import type { SuperAppPreference } from '@/domain/superapp';
import { apiFetch, tryActiveOrgId } from '@/lib/http/client';

function apply(locale:SuperAppPreference['locale']){
  const effective=locale==='auto'?'en':locale;
  document.documentElement.lang=effective;
  document.documentElement.dir=effective==='ar'?'rtl':'ltr';
  document.documentElement.dataset.opsiqoLocale=effective;
  window.dispatchEvent(new CustomEvent('opsiqo:locale-changed',{detail:{locale:effective}}));
}
export function LanguageBootstrap(){
  useEffect(()=>{
    let alive=true;
    const load=()=>{const org=tryActiveOrgId();if(!org)return;apiFetch<{data:SuperAppPreference}>(`/api/organizations/${org}/superapp/preferences`).then(r=>{if(alive)apply(r.data.locale)}).catch(()=>undefined)};
    load();
    const h=()=>load();window.addEventListener('opsiqo:organization-changed',h);window.addEventListener('opsiqo:locale-preference-changed',h);
    return()=>{alive=false;window.removeEventListener('opsiqo:organization-changed',h);window.removeEventListener('opsiqo:locale-preference-changed',h)};
  },[]);
  return null;
}
