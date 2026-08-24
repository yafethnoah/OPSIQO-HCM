'use client';

import { useEffect } from 'react';
import { currentShellLocale } from './shell-i18n';
import { hasRuntimeUiTranslation } from './runtime-ui-i18n';

const LATIN_TEXT = /[A-Za-z]{3,}/;
const EMAIL_OR_URL = /(?:https?:\/\/|www\.|\S+@\S+)/i;
const TECHNICAL_TOKEN = /^(?:OPSIQO|AI|HCM|HR|HRIS|ATS|LMS|MFA|SSO|JIT|API|SLA|SLO|KPI|CSV|XLSX|PDF|SHA-?256|CAD|USD|EUR|GBP|ID)$/i;

function candidateText(value: string): string | null {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 3 || text.length > 180) return null;
  if (!LATIN_TEXT.test(text) || EMAIL_OR_URL.test(text) || TECHNICAL_TOKEN.test(text)) return null;
  if (/^[A-Z0-9_.:/-]+$/.test(text)) return null;
  return text;
}

function visible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return true;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

export function useRuntimeLocalizationDiagnostics(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const diagnosticsEnabled = window.location.hostname.startsWith('uat.') || process.env.NEXT_PUBLIC_OPSIQO_LOCALIZATION_DIAGNOSTICS === 'true';
    if (!diagnosticsEnabled) return;

    let timer = 0;
    const scan = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const locale = currentShellLocale();
        if (locale === 'en') return;
        const residual = new Set<string>();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const parent = node.parentElement;
          if (!parent || !visible(parent) || parent.closest('script,style,code,pre,[data-opsiqo-no-translate="true"]')) continue;
          const text = candidateText(node.textContent || '');
          if (!text || hasRuntimeUiTranslation(text)) continue;
          residual.add(text);
          if (residual.size >= 100) break;
        }
        const detail = { locale, path: window.location.pathname, residualEnglish: [...residual].sort() };
        window.dispatchEvent(new CustomEvent('opsiqo:localization-audit', { detail }));
        if (detail.residualEnglish.length) console.warn('[OPSIQO-I18N-AUDIT] untranslated visible text candidates', detail);
      }, 250);
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    window.addEventListener('opsiqo:locale-changed', scan);
    scan();
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('opsiqo:locale-changed', scan);
    };
  }, [enabled]);
}
