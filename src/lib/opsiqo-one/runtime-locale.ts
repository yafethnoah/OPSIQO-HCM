'use client';

import { useEffect } from 'react';
import { apiFetch, tryActiveOrgId } from '@/lib/http/client';
import type { ShellLocale } from './shell-i18n';

const RUNTIME_LOCALE_KEY='opsiqo.runtimeLocale';

export type RuntimeLocaleSource='bootstrap'|'user'|'stored'|'organization'|'fallback';

export function normalizeRuntimeLocale(raw:unknown):ShellLocale{
  const value=String(raw||'').trim().toLowerCase();
  if(value.startsWith('fr'))return'fr';
  if(value.startsWith('es'))return'es';
  if(value.startsWith('ar'))return'ar';
  return'en';
}

export function runtimeLocaleDirection(locale:ShellLocale):'ltr'|'rtl'{
  return locale==='ar'?'rtl':'ltr';
}

export function storedRuntimeLocale():ShellLocale|null{
  if(typeof window==='undefined')return null;
  try{
    const raw=window.localStorage.getItem(RUNTIME_LOCALE_KEY);
    return raw?normalizeRuntimeLocale(raw):null;
  }catch{
    return null;
  }
}

function persistRuntimeLocale(locale:ShellLocale|null){
  if(typeof window==='undefined')return;
  try{
    if(locale)window.localStorage.setItem(RUNTIME_LOCALE_KEY,locale);
    else window.localStorage.removeItem(RUNTIME_LOCALE_KEY);
  }catch{
    // Storage can be unavailable under hardened browser policies.
  }
}

export function applyRuntimeLocale(
  raw:unknown,
  options:{persist?:boolean;source?:RuntimeLocaleSource}={}
):ShellLocale{
  const locale=normalizeRuntimeLocale(raw);
  if(typeof document==='undefined')return locale;

  const root=document.documentElement;
  const direction=runtimeLocaleDirection(locale);
  const source=options.source||'fallback';
  const changed=
    root.lang!==locale||
    root.dir!==direction||
    root.dataset.opsiqoLocale!==locale||
    root.dataset.opsiqoLocaleSource!==source;

  root.lang=locale;
  root.dir=direction;
  root.dataset.opsiqoLocale=locale;
  root.dataset.opsiqoLocaleSource=source;

  if(typeof window!=='undefined'){
    if(options.persist===true)persistRuntimeLocale(locale);
    if(changed)window.dispatchEvent(new CustomEvent('opsiqo:locale-changed',{detail:{locale,source}}));
  }
  return locale;
}

export function applyOrganizationRuntimeLocale(raw:unknown):ShellLocale{
  const stored=storedRuntimeLocale();
  if(stored)return applyRuntimeLocale(stored,{persist:false,source:'stored'});
  return applyRuntimeLocale(raw,{persist:false,source:'organization'});
}

export function setRuntimeLocalePreference(raw:unknown):ShellLocale|null{
  const value=String(raw||'auto').trim().toLowerCase();
  if(!value||value==='auto'||value==='system'){
    persistRuntimeLocale(null);
    if(typeof window!=='undefined'){
      window.dispatchEvent(new CustomEvent('opsiqo:locale-preference-changed',{detail:{locale:'auto'}}));
    }
    return null;
  }

  const locale=normalizeRuntimeLocale(value);
  persistRuntimeLocale(locale);
  applyRuntimeLocale(locale,{persist:false,source:'user'});
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('opsiqo:locale-preference-changed',{detail:{locale}}));
  }
  return locale;
}

export async function refreshRuntimeLocale():Promise<ShellLocale>{
  const stored=storedRuntimeLocale();
  if(stored)applyRuntimeLocale(stored,{persist:false,source:'stored'});

  const orgId=tryActiveOrgId();
  if(!orgId)return stored||applyRuntimeLocale('en',{persist:false,source:'fallback'});

  const [preferenceResult,platformResult]=await Promise.allSettled([
    apiFetch<{data:{locale?:unknown}}>(`/api/organizations/${orgId}/superapp/preferences`),
    apiFetch<{data:{defaultLocale?:unknown}}>(`/api/organizations/${orgId}/platform-settings`),
  ]);

  if(preferenceResult.status==='fulfilled'){
    const preference=String(preferenceResult.value.data?.locale||'auto').trim().toLowerCase();
    if(preference&&preference!=='auto'&&preference!=='system'){
      const locale=normalizeRuntimeLocale(preference);
      persistRuntimeLocale(locale);
      return applyRuntimeLocale(locale,{persist:false,source:'user'});
    }
    // The server is authoritative for "auto": discard a stale local override.
    persistRuntimeLocale(null);
  }else if(stored){
    // Offline/session-limited fallback: preserve the explicit stored preference.
    return applyRuntimeLocale(stored,{persist:false,source:'stored'});
  }

  if(platformResult.status==='fulfilled'){
    return applyRuntimeLocale(platformResult.value.data?.defaultLocale||'en',{persist:false,source:'organization'});
  }

  return applyRuntimeLocale('en',{persist:false,source:'fallback'});
}

export function useRuntimeLocaleSync(enabled=true){
  useEffect(()=>{
    let cancelled=false;

    const stored=storedRuntimeLocale();
    if(stored)applyRuntimeLocale(stored,{persist:false,source:'stored'});

    const refresh=async()=>{
      try{
        const locale=await refreshRuntimeLocale();
        if(cancelled)return;
        // refreshRuntimeLocale already applied the authoritative locale.
        return locale;
      }catch{
        if(!cancelled){
          const fallback=storedRuntimeLocale();
          applyRuntimeLocale(fallback||'en',{persist:false,source:fallback?'stored':'fallback'});
        }
      }
    };

    if(enabled)void refresh();

    const onOrganizationChanged=()=>{if(enabled)void refresh()};
    const onLocaleRefresh=()=>{if(enabled)void refresh()};
    const onPreferenceChanged=()=>{if(enabled)void refresh()};

    window.addEventListener('opsiqo:organization-changed',onOrganizationChanged);
    window.addEventListener('opsiqo:runtime-locale-refresh',onLocaleRefresh);
    window.addEventListener('opsiqo:locale-preference-changed',onPreferenceChanged);

    return()=>{
      cancelled=true;
      window.removeEventListener('opsiqo:organization-changed',onOrganizationChanged);
      window.removeEventListener('opsiqo:runtime-locale-refresh',onLocaleRefresh);
      window.removeEventListener('opsiqo:locale-preference-changed',onPreferenceChanged);
    };
  },[enabled]);
}
