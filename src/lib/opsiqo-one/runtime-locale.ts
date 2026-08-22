'use client';

import { useEffect } from 'react';
import { apiFetch, tryActiveOrgId } from '@/lib/http/client';
import type { ShellLocale } from './shell-i18n';

const RUNTIME_LOCALE_KEY = 'opsiqo.runtimeLocale';

export function normalizeRuntimeLocale(raw: unknown): ShellLocale {
  const value = String(raw || '').trim().toLowerCase();
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

export function runtimeLocaleDirection(locale: ShellLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function applyRuntimeLocale(raw: unknown, options: { persist?: boolean } = {}): ShellLocale {
  const locale = normalizeRuntimeLocale(raw);
  if (typeof document === 'undefined') return locale;

  const root = document.documentElement;
  const direction = runtimeLocaleDirection(locale);
  const changed = root.lang !== locale || root.dir !== direction || root.dataset.opsiqoLocale !== locale;

  root.lang = locale;
  root.dir = direction;
  root.dataset.opsiqoLocale = locale;

  if (typeof window !== 'undefined') {
    if (options.persist !== false) {
      try { window.localStorage.setItem(RUNTIME_LOCALE_KEY, locale); } catch { /* storage may be unavailable */ }
    }
    if (changed) window.dispatchEvent(new CustomEvent('opsiqo:locale-changed', { detail: { locale } }));
  }

  return locale;
}

function storedRuntimeLocale(): ShellLocale | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(RUNTIME_LOCALE_KEY);
    return stored ? normalizeRuntimeLocale(stored) : null;
  } catch {
    return null;
  }
}

export function useRuntimeLocaleSync(enabled = true) {
  useEffect(() => {
    let cancelled = false;

    const stored = storedRuntimeLocale();
    if (stored) applyRuntimeLocale(stored, { persist: false });

    if (!enabled) return () => { cancelled = true; };

    const refreshOrganizationLocale = async () => {
      const orgId = tryActiveOrgId();
      if (!orgId) return;
      try {
        const response = await apiFetch<{ data: { defaultLocale?: unknown } }>(
          `/api/organizations/${orgId}/platform-settings`,
        );
        if (!cancelled) applyRuntimeLocale(response.data?.defaultLocale);
      } catch {
        // Authentication, organization, MFA and session errors are handled by their
        // dedicated UI/security paths. Locale synchronization must fail closed.
      }
    };

    void refreshOrganizationLocale();
    const onOrganizationChanged = () => void refreshOrganizationLocale();
    const onLocaleRefresh = () => void refreshOrganizationLocale();

    window.addEventListener('opsiqo:organization-changed', onOrganizationChanged);
    window.addEventListener('opsiqo:runtime-locale-refresh', onLocaleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('opsiqo:organization-changed', onOrganizationChanged);
      window.removeEventListener('opsiqo:runtime-locale-refresh', onLocaleRefresh);
    };
  }, [enabled]);
}
