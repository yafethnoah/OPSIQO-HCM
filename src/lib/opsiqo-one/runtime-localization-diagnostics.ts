'use client';

import { useEffect } from 'react';
import { currentShellLocale } from './shell-i18n';

type AuditDetail={
  locale:string;
  path:string;
  direction:string;
  expectedDirection:'ltr'|'rtl';
  directionMismatch:boolean;
  residualEnglish:string[];
  scannedAttributes:number;
};

declare global {
  interface Window { __OPSIQO_LOCALIZATION_AUDIT__?: AuditDetail }
}

const LATIN_TEXT=/[A-Za-z]{3,}/;
const EMAIL_OR_URL=/(?:https?:\/\/|www\.|\S+@\S+)/i;
const TECHNICAL_ONLY=/^(?:(?:OPSIQO(?: ONE)?|AI|HCM|HR|HRIS|ATS|LMS|MFA|SSO|JIT|API|SLA|SLO|KPI|CSV|XLSX|PDF|DOCX|TXT|RTF|JSON|SHA-?256|CAD|USD|EUR|GBP|ID|TSX)(?:\s*[·|/+-]\s*)?)+$/i;
const UI_WORDS=new Set(['home','settings','employee','manager','organization','compliance','policy','intelligence','workforce','people','learning','career','performance','compensation','security','audit','translation','readiness','evidence','operations','automation','import','center','portal','service','health','safety','governance','notifications','work','skills','documents','leave','search','open','review','active','unread','requests','lifecycle','analytics','planning']);

function likelyProperName(text:string){
  const words=text.split(/\s+/).filter(Boolean);
  if(words.length<2||words.length>5)return false;
  if(!words.every(word=>/^[A-Z][A-Za-z'.-]*$/.test(word)))return false;
  return !words.some(word=>UI_WORDS.has(word.toLowerCase()));
}

function candidateText(value:string):string|null{
  const text=value.replace(/\s+/g,' ').trim();
  if(text.length<3||text.length>240)return null;
  if(!LATIN_TEXT.test(text)||EMAIL_OR_URL.test(text)||TECHNICAL_ONLY.test(text))return null;
  if(/^[A-Z0-9_.:/-]+$/.test(text))return null;
  if(/^v?\d+(?:\.\d+)+(?:\s*·\s*[A-Z0-9. ]+)?$/i.test(text))return null;
  if(/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(text))return null;
  if(likelyProperName(text))return null;
  return text;
}

function visible(element:Element):boolean{
  if(!(element instanceof HTMLElement))return true;
  const style=window.getComputedStyle(element);
  return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';
}

function excluded(element:Element|null){
  return !element||Boolean(element.closest('script,style,code,pre,[data-opsiqo-no-translate="true"],[data-opsiqo-i18n-allow="true"]'));
}

export function useRuntimeLocalizationDiagnostics(enabled=true){
  useEffect(()=>{
    if(!enabled||typeof window==='undefined')return;
    const diagnosticsEnabled=window.location.hostname.startsWith('uat.')||process.env.NEXT_PUBLIC_OPSIQO_LOCALIZATION_DIAGNOSTICS==='true';
    if(!diagnosticsEnabled)return;

    let timer=0;
    const scan=()=>{
      window.clearTimeout(timer);
      timer=window.setTimeout(()=>{
        const locale=currentShellLocale();
        const expectedDirection=locale==='ar'?'rtl':'ltr';
        const direction=document.documentElement.dir||window.getComputedStyle(document.documentElement).direction||'ltr';
        const residual=new Set<string>();
        let scannedAttributes=0;

        if(locale!=='en'){
          const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          let node:Node|null;
          while((node=walker.nextNode())){
            const parent=node.parentElement;
            if(excluded(parent)||!visible(parent!))continue;
            const text=candidateText(node.textContent||'');
            if(text)residual.add(text);
            if(residual.size>=200)break;
          }

          for(const el of Array.from(document.body.querySelectorAll<HTMLElement>('[placeholder],[title],[aria-label],[alt]'))){
            if(excluded(el)||!visible(el))continue;
            for(const attr of ['placeholder','title','aria-label','alt'] as const){
              const value=el.getAttribute(attr);
              if(!value)continue;
              scannedAttributes++;
              const text=candidateText(value);
              if(text)residual.add(text);
              if(residual.size>=200)break;
            }
            if(residual.size>=200)break;
          }
        }

        const detail:AuditDetail={
          locale,
          path:window.location.pathname,
          direction,
          expectedDirection,
          directionMismatch:direction!==expectedDirection,
          residualEnglish:[...residual].sort(),
          scannedAttributes
        };
        window.__OPSIQO_LOCALIZATION_AUDIT__=detail;
        document.documentElement.dataset.opsiqoLocalizationLocale=locale;
        document.documentElement.dataset.opsiqoLocalizationResidualCount=String(detail.residualEnglish.length);
        document.documentElement.dataset.opsiqoLocalizationDirection=direction;
        document.documentElement.dataset.opsiqoLocalizationStatus=(detail.directionMismatch||detail.residualEnglish.length)?'fail':'pass';
        window.dispatchEvent(new CustomEvent('opsiqo:localization-audit',{detail}));
        if(detail.directionMismatch||detail.residualEnglish.length)console.warn('[OPSIQO-I18N-AUDIT] rendered localization gap',detail);
      },250);
    };

    const observer=new MutationObserver(scan);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']});
    window.addEventListener('opsiqo:locale-changed',scan);
    scan();
    return()=>{window.clearTimeout(timer);observer.disconnect();window.removeEventListener('opsiqo:locale-changed',scan)};
  },[enabled]);
}
