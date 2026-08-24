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
  return excluded(node)||Boolean(parent?.closest('[data-opsiqo-legacy-surface]') || parent?.closest('[data-opsiqo-shell-i18n="true"]'));
}
function applySurfaceTranslation(root:HTMLElement,surfaceId:SurfaceId,locale:ShellLocale){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(excluded(node))continue;
    const text=node as Text,current=text.data,trimmed=current.trim();
    if(!trimmed)continue;
    if(!originalText.has(text))originalText.set(text,trimmed);
    const source=originalText.get(text)!;
    const next=translated(surfaceId,source,locale);
    if(current.trim()!==next)text.data=replaceTrimmed(source,next,current);
  }
  for(const el of [root,...Array.from(root.querySelectorAll<HTMLElement>('*'))]){
    if(excluded(el))continue;
    let originals=originalAttr.get(el);if(!originals){originals=new Map();originalAttr.set(el,originals)}
    for(const attr of attrNames){const value=el.getAttribute(attr);if(!value)continue;if(!originals.has(attr))originals.set(attr,value);const source=originals.get(attr)!;const next=translated(surfaceId,source,locale);if(value!==next)el.setAttribute(attr,next)}
  }
}
function applyGlobalReviewedTranslation(root:HTMLElement,locale:ShellLocale){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(excludedFromGlobal(node))continue;
    const text=node as Text,current=text.data,trimmed=current.trim();
    if(!trimmed)continue;
    if(!globalOriginalText.has(text))globalOriginalText.set(text,trimmed);
    const source=globalOriginalText.get(text)!;
    const next=translatedGlobally(source,locale);
    if(current.trim()!==next)text.data=replaceTrimmed(source,next,current);
  }
  for(const el of [root,...Array.from(root.querySelectorAll<HTMLElement>('*'))]){
    if(excludedFromGlobal(el))continue;
    let originals=globalOriginalAttr.get(el);if(!originals){originals=new Map();globalOriginalAttr.set(el,originals)}
    for(const attr of attrNames){const value=el.getAttribute(attr);if(!value)continue;if(!originals.has(attr))originals.set(attr,value);const source=originals.get(attr)!;const next=translatedGlobally(source,locale);if(value!==next)el.setAttribute(attr,next)}
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
export const LEGACY_TRANSLATION_SURFACES=Object.keys(catalog) as SurfaceId[];
export const GLOBAL_REVIEWED_TRANSLATION_COUNT=Array.from(globalReviewedTranslations.values()).filter(Boolean).length;
