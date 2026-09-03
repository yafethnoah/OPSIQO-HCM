'use client';
import { useEffect, type RefObject } from 'react';
import catalog from './legacy-surface-translations-v7-32.json';
import { runtimeUiTranslation } from './runtime-ui-i18n';
import { currentShellLocale, useShellLocale, type ShellLocale } from './shell-i18n';

type SurfaceId = keyof typeof catalog;
type Translated = { fr:string; es:string; ar:string };
const originalText = new WeakMap<Text,string>();
const originalAttr = new WeakMap<Element,Map<string,string>>();
const globalOriginalText = new WeakMap<Text,string>();
const globalOriginalAttr = new WeakMap<Element,Map<string,string>>();
const attrNames = ['placeholder','title','aria-label'] as const;
const supportedLocales:ShellLocale[]=['en','fr','es','ar'];

function refreshSource<T extends Text|Element>(map:WeakMap<T,string>,node:T,current:string,render:(source:string,locale:ShellLocale)=>string){
  let source=map.get(node);
  if(!source){map.set(node,current);return current;}
  const stillRendered=source===current||supportedLocales.some(locale=>render(source!,locale)===current);
  if(!stillRendered){source=current;map.set(node,current);}
  return source;
}
function refreshAttrSource(map:Map<string,string>,attr:string,current:string,render:(source:string,locale:ShellLocale)=>string){
  let source=map.get(attr);
  if(!source){map.set(attr,current);return current;}
  const stillRendered=source===current||supportedLocales.some(locale=>render(source!,locale)===current);
  if(!stillRendered){source=current;map.set(attr,current);}
  return source;
}

function sameTranslation(a:Translated,b:Translated){return a.fr===b.fr&&a.es===b.es&&a.ar===b.ar}
function buildGlobalReviewedTranslations(){
  const pool=new Map<string,Translated|null>();
  for(const surface of Object.values(catalog)){
    for(const [source,value] of Object.entries(surface.translations as Record<string,Translated>)){
      const existing=pool.get(source);
      if(existing===undefined)pool.set(source,value);
      else if(existing!==null&&!sameTranslation(existing,value))pool.set(source,null);
    }
  }
  return pool;
}
const globalReviewedTranslations=buildGlobalReviewedTranslations();
function globalTranslation(source:string):Translated|undefined{const value=globalReviewedTranslations.get(source);return value||undefined}

function translated(surfaceId:SurfaceId, source:string, locale:ShellLocale):string{
  if(locale==='en') return source;
  const local=(catalog[surfaceId].translations as Record<string,Translated>)[source];
  if(local?.[locale]) return local[locale];
  const runtime=runtimeUiTranslation(source,locale);
  if(runtime) return runtime;
  return globalTranslation(source)?.[locale] || source;
}
function translatedGlobally(source:string,locale:ShellLocale):string{
  if(locale==='en')return source;
  return runtimeUiTranslation(source,locale)||globalTranslation(source)?.[locale]||source;
}
function replaceTrimmed(_source:string,replacement:string,current:string){
  const start=current.length-current.trimStart().length,end=current.length-current.trimEnd().length;
  return `${current.slice(0,start)}${replacement}${end?current.slice(current.length-end):''}`;
}
function excluded(node:Node){
  const parent=node.nodeType===Node.TEXT_NODE?node.parentElement:node as Element;
  return Boolean(parent?.closest('code,pre,[data-opsiqo-no-translate="true"],[data-opsiqo-shell-i18n="true"]'));
}
function excludedFromGlobal(node:Node){
  const parent=node.nodeType===Node.TEXT_NODE?node.parentElement:node as Element;
  return excluded(node)||Boolean(parent?.closest('[data-opsiqo-legacy-surface]') || parent?.closest('[data-opsiqo-route-surface]') || parent?.closest('[data-opsiqo-shell-i18n="true"]'));
}
function applySurfaceTranslation(root:HTMLElement,surfaceId:SurfaceId,locale:ShellLocale){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(excluded(node))continue;
    const text=node as Text,current=text.data,trimmed=current.trim();
    if(!trimmed)continue;
    const source=refreshSource(originalText,text,trimmed,(value,nextLocale)=>translated(surfaceId,value,nextLocale));
    const next=translated(surfaceId,source,locale);
    if(current.trim()!==next)text.data=replaceTrimmed(source,next,current);
  }
  for(const el of [root,...Array.from(root.querySelectorAll<HTMLElement>('*'))]){
    if(excluded(el))continue;
    let originals=originalAttr.get(el);if(!originals){originals=new Map();originalAttr.set(el,originals)}
    for(const attr of attrNames){const value=el.getAttribute(attr);if(!value)continue;const source=refreshAttrSource(originals,attr,value,(current,nextLocale)=>translated(surfaceId,current,nextLocale));const next=translated(surfaceId,source,locale);if(value!==next)el.setAttribute(attr,next)}
  }
}
function applyGlobalReviewedTranslation(root:HTMLElement,locale:ShellLocale){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(excludedFromGlobal(node))continue;
    const text=node as Text,current=text.data,trimmed=current.trim();
    if(!trimmed)continue;
    const source=refreshSource(globalOriginalText,text,trimmed,translatedGlobally);
    const next=translatedGlobally(source,locale);
    if(current.trim()!==next)text.data=replaceTrimmed(source,next,current);
  }
  for(const el of [root,...Array.from(root.querySelectorAll<HTMLElement>('*'))]){
    if(excludedFromGlobal(el))continue;
    let originals=globalOriginalAttr.get(el);if(!originals){originals=new Map();globalOriginalAttr.set(el,originals)}
    for(const attr of attrNames){const value=el.getAttribute(attr);if(!value)continue;const source=refreshAttrSource(originals,attr,value,translatedGlobally);const next=translatedGlobally(source,locale);if(value!==next)el.setAttribute(attr,next)}
  }
}
export function useLegacySurfaceTranslation(surfaceId:SurfaceId,ref:RefObject<HTMLElement|null>){
  const locale=useShellLocale();
  useEffect(()=>{
    let root:HTMLElement|null=null;
    let observer:MutationObserver|null=null;
    let mountObserver:MutationObserver|null=null;
    let queued=false,cancelled=false;
    const apply=()=>{
      if(cancelled||!root)return;
      queued=false;
      applySurfaceTranslation(root,surfaceId,currentShellLocale());
    };
    const schedule=()=>{if(queued||cancelled||!root)return;queued=true;queueMicrotask(apply)};
    const attach=()=>{
      if(cancelled||root)return Boolean(root);
      const candidate=ref.current;
      if(!candidate)return false;
      root=candidate;
      root.setAttribute('data-opsiqo-legacy-surface',String(surfaceId));
      applySurfaceTranslation(root,surfaceId,currentShellLocale());
      observer=new MutationObserver(schedule);
      observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attrNames]});
      return true;
    };
    if(!attach()){
      mountObserver=new MutationObserver(()=>{if(attach())mountObserver?.disconnect()});
      mountObserver.observe(document.body,{subtree:true,childList:true});
    }
    const onLocaleChanged=()=>{if(attach())apply()};
    window.addEventListener('opsiqo:locale-changed',onLocaleChanged);
    return()=>{
      cancelled=true;
      window.removeEventListener('opsiqo:locale-changed',onLocaleChanged);
      mountObserver?.disconnect();
      observer?.disconnect();
      if(root?.getAttribute('data-opsiqo-legacy-surface')===String(surfaceId))root.removeAttribute('data-opsiqo-legacy-surface');
    };
  },[surfaceId,locale,ref]);
}
export function useGlobalReviewedTranslation(){
  const locale=useShellLocale();
  useEffect(()=>{
    const root=document.body;if(!root)return;
    let queued=false,cancelled=false;
    const apply=()=>{if(cancelled)return;queued=false;applyGlobalReviewedTranslation(root,currentShellLocale())};
    const schedule=()=>{if(queued||cancelled)return;queued=true;queueMicrotask(apply)};
    const onLocaleChanged=()=>apply();
    const raf=requestAnimationFrame(schedule);
    window.addEventListener('opsiqo:locale-changed',onLocaleChanged);
    const observer=new MutationObserver(schedule);
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attrNames]});
    return()=>{cancelled=true;window.removeEventListener('opsiqo:locale-changed',onLocaleChanged);cancelAnimationFrame(raf);observer.disconnect()};
  },[locale]);
}

type CatalogEntry={file?:string;translations:Record<string,Translated>};

function normalizedRoute(pathname:string){
  return pathname.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g,'').toLowerCase();
}
function normalizedId(value:string){
  return value.toLowerCase().replace(/[_\s/]+/g,'-').replace(/-+/g,'-');
}
const NATIVE_REACT_LOCALIZED_ROUTES=new Set<string>([
  '/translation-readiness',
]);

export type RouteLocalizationOwnership=
  |{kind:'native-react';surfaceId:null}
  |{kind:'reviewed-surface';surfaceId:SurfaceId}
  |{kind:'none';surfaceId:null};

export function routeLocalizationOwnership(pathname:string):RouteLocalizationOwnership{
  const normalized='/' + normalizedRoute(pathname);
  if(NATIVE_REACT_LOCALIZED_ROUTES.has(normalized)){
    return{kind:'native-react',surfaceId:null};
  }
  const surfaceId=inferRouteSurface(pathname);
  return surfaceId
    ?{kind:'reviewed-surface',surfaceId}
    :{kind:'none',surfaceId:null};
}

export function inferRouteSurface(pathname:string):SurfaceId|null{
  const route=normalizedRoute(pathname);
  if(!route)return null;
  const leaf=route.split('/').filter(Boolean).pop()||route;
  const slug=route.replace(/\//g,'-');
  let best:{id:SurfaceId;score:number}[]=[];

  for(const [id,raw] of Object.entries(catalog) as [SurfaceId,CatalogEntry][]){
    const file=String(raw.file||'').toLowerCase().replace(/\\/g,'/');
    const idNorm=normalizedId(String(id));
    let score=0;

    if(file.includes(`/app/${route}/page.tsx`))score=120;
    else if(file.includes(`/${slug}-workspace.tsx`))score=110;
    else if(file.includes(`/${leaf}-workspace.tsx`))score=105;
    else if(file.includes(`/${slug}-center.tsx`))score=100;
    else if(file.includes(`/${leaf}-center.tsx`))score=95;
    else if(idNorm===slug||idNorm===leaf)score=90;
    else if(file.includes(`/${slug}-`)||file.includes(`/${leaf}-`))score=80;
    else if(idNorm.includes(slug)||idNorm.includes(leaf))score=60;

    if(score>0)best.push({id,score});
  }

  if(!best.length)return null;
  best=best.sort((a,b)=>b.score-a.score);
  if(best.length>1&&best[0].score===best[1].score&&best[0].id!==best[1].id)return null;
  return best[0].id;
}

function excludedFromRoute(node:Node){
  const parent=node.nodeType===Node.TEXT_NODE?node.parentElement:node as Element;
  if(!parent)return true;
  if(excluded(node))return true;
  return Boolean(parent.closest('[data-opsiqo-legacy-surface]'));
}
function applyRouteSurfaceTranslation(root:HTMLElement,surfaceId:SurfaceId,locale:ShellLocale){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(excludedFromRoute(node))continue;
    const text=node as Text,current=text.data,trimmed=current.trim();
    if(!trimmed)continue;
    const source=refreshSource(originalText,text,trimmed,(value,nextLocale)=>translated(surfaceId,value,nextLocale));
    const next=translated(surfaceId,source,locale);
    if(current.trim()!==next)text.data=replaceTrimmed(source,next,current);
  }

  for(const el of [root,...Array.from(root.querySelectorAll<HTMLElement>('*'))]){
    if(excludedFromRoute(el))continue;
    let originals=originalAttr.get(el);
    if(!originals){originals=new Map();originalAttr.set(el,originals)}
    for(const attr of attrNames){
      const value=el.getAttribute(attr);
      if(!value)continue;
      const source=refreshAttrSource(originals,attr,value,(current,nextLocale)=>translated(surfaceId,current,nextLocale));
      const next=translated(surfaceId,source,locale);
      if(value!==next)el.setAttribute(attr,next);
    }
  }
}

export function useRouteReviewedTranslation(pathname:string,enabled=true){
  const locale=useShellLocale();
  useEffect(()=>{
    if(!enabled)return;
    const root=document.querySelector<HTMLElement>('[data-opsiqo-route-surface-host="true"]');
    const ownership=routeLocalizationOwnership(pathname);
    if(!root||ownership.kind==='none')return;

    if(ownership.kind==='native-react'){
      root.setAttribute('data-opsiqo-route-surface','native-react');
      return()=>{
        if(root.getAttribute('data-opsiqo-route-surface')==='native-react'){
          root.removeAttribute('data-opsiqo-route-surface');
        }
      };
    }

    const surfaceId=ownership.surfaceId;
    let cancelled=false,queued=false;
    root.setAttribute('data-opsiqo-route-surface',String(surfaceId));

    const apply=()=>{
      if(cancelled)return;
      queued=false;
      applyRouteSurfaceTranslation(root,surfaceId,currentShellLocale());
    };
    const schedule=()=>{
      if(cancelled||queued)return;
      queued=true;
      queueMicrotask(apply);
    };

    apply();
    const observer=new MutationObserver(schedule);
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attrNames]});
    const onLocaleChanged=()=>apply();
    window.addEventListener('opsiqo:locale-changed',onLocaleChanged);

    return()=>{
      cancelled=true;
      observer.disconnect();
      window.removeEventListener('opsiqo:locale-changed',onLocaleChanged);
      if(root.getAttribute('data-opsiqo-route-surface')===String(surfaceId))root.removeAttribute('data-opsiqo-route-surface');
    };
  },[enabled,pathname,locale]);
}

export const LEGACY_TRANSLATION_SURFACES=Object.keys(catalog) as SurfaceId[];
export const GLOBAL_REVIEWED_TRANSLATION_COUNT=Array.from(globalReviewedTranslations.values()).filter(Boolean).length;
