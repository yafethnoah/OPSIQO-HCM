'use client';

import { getToken as getAppCheckToken } from 'firebase/app-check';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseAppCheck, firebaseAuth } from '@/lib/firebase/client';
import { fetchWithReliability, ReconciliationRequiredError } from '@/lib/http/reliability';
import { apiRequestErrorFromPayload, isKnownPreWriteServerError } from '@/lib/http/api-request-error';
export { ApiRequestError, isMfaRequiredError } from '@/lib/http/api-request-error';

const ORG_STORAGE_KEY = 'opsiqo.activeOrgId';
let authRestorePromise: Promise<User | null> | undefined;

type OrgContextMode = 'required' | 'omit';
export type ApiFetchInit = RequestInit & {
  orgContext?: OrgContextMode;
  /**
   * Persistent writes must reconcile after an ambiguous 5xx response. Set this
   * to false only for non-persistent POST operations such as document parsing.
   */
  reconcileOnServerError?: boolean;
};

const demoMode = () => process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE === 'true';

function configuredOrgId(): string {
  const configured = String(process.env.NEXT_PUBLIC_OPSIQO_ORG_ID || process.env.NEXT_PUBLIC_OPSIQO_DEFAULT_ORG_ID || '').trim();
  if (configured) return configured;

  if (demoMode()) {
    return String(process.env.NEXT_PUBLIC_OPSIQO_DEMO_ORG_ID || 'demo-org').trim();
  }

  return '';
}

export function tryActiveOrgId(): string | null {
  if (typeof window !== 'undefined') {
    const stored = String(window.localStorage.getItem(ORG_STORAGE_KEY) || '').trim();
    if (stored) return stored;
  }

  const configured = configuredOrgId();
  return configured || null;
}

export function activeOrgId(): string {
  if (typeof window === 'undefined') return configuredOrgId();
  const orgId = tryActiveOrgId();
  if (!orgId) {
    throw new Error('No active organization selected. Sign in and select an organization before continuing.');
  }
  return orgId;
}

export function setActiveOrgId(orgId: string) {
  if (typeof window === 'undefined') return;
  const normalized = String(orgId || '').trim();
  if (!normalized) throw new Error('Organization id is required.');
  window.localStorage.setItem(ORG_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent('opsiqo:organization-changed', { detail: { orgId: normalized } }));
}

export function clearActiveOrgId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ORG_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('opsiqo:organization-changed', { detail: { orgId: null } }));
}

async function restoredFirebaseUser(): Promise<User | null> {
  const auth = firebaseAuth();
  if (auth.currentUser) return auth.currentUser;

  if (!authRestorePromise) {
    authRestorePromise = new Promise<User | null>((resolve, reject) => {
      let unsubscribe = () => {};
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          reject(error);
        },
      );
    }).finally(() => {
      authRestorePromise = undefined;
    });
  }

  return authRestorePromise;
}

async function applyIdentityHeaders(headers: Headers) {
  if (demoMode()) return;

  const user = await restoredFirebaseUser();
  if (!user) throw new Error('Sign in required.');

  const appCheck = firebaseAppCheck();
  if (appCheck) {
    headers.set('x-firebase-appcheck', (await getAppCheckToken(appCheck, false)).token);
  }

  headers.set('authorization', `Bearer ${await user.getIdToken()}`);
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const {
    orgContext = 'required',
    reconcileOnServerError = true,
    ...requestInit
  } = init;
  const headers = new Headers(requestInit.headers);

  if (requestInit.body != null && !(requestInit.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  await applyIdentityHeaders(headers);

  if (orgContext === 'required') {
    headers.set('x-org-id', activeOrgId());
  } else {
    headers.delete('x-org-id');
  }

  const method=String(requestInit.method||'GET').toUpperCase();
  const safeRead=['GET','HEAD','OPTIONS'].includes(method);
  const response = await fetchWithReliability(path, { ...requestInit, headers, cache: 'no-store', maxReadAttempts:safeRead?3:1, executionState:safeRead?undefined:'not_started' });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const requestError = apiRequestErrorFromPayload(response.status, payload, `Request failed (${response.status})`);

    if (
      !safeRead &&
      reconcileOnServerError && (response.status === 408 || response.status >= 500) &&
      !isKnownPreWriteServerError(requestError)
    ) {
      throw new ReconciliationRequiredError(`Write returned ${response.status}; reconcile authoritative state before retrying.`);
    }

    if (typeof window !== 'undefined' && requestError.status === 401 && requestError.code === 'session_expired') {
      window.dispatchEvent(new CustomEvent('opsiqo:session-expired', { detail: { message: requestError.message } }));
    }
    throw requestError;
  }

  return payload as T;
}

export async function apiDownload(path: string, init: ApiFetchInit = {}): Promise<{ blob: Blob; fileName?: string }> {
  const { orgContext = 'required', ...requestInit } = init;
  const headers = new Headers(requestInit.headers);

  if (requestInit.body != null && !(requestInit.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  await applyIdentityHeaders(headers);
  if (orgContext === 'required') headers.set('x-org-id', activeOrgId());
  else headers.delete('x-org-id');

  const method = String(requestInit.method || 'GET').toUpperCase();
  const safeRead = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const response = await fetchWithReliability(path, {
    ...requestInit,
    headers,
    cache: 'no-store',
    maxReadAttempts: safeRead ? 3 : 1,
    executionState: safeRead ? undefined : 'not_started',
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => '');
    throw apiRequestErrorFromPayload(response.status, payload, `Download failed (${response.status})`);
  }

  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  return { blob: await response.blob(), fileName: match?.[1] };
}
