'use client';

import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';

const APP_CHECK_KEY = '__opsiqoAppCheck';

type OpsiqoWindow = Window & { [APP_CHECK_KEY]?: AppCheck };

export function firebaseClientApp() {
  if (getApps().length) return getApps()[0]!;
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export function firebaseAuth() { return getAuth(firebaseClientApp()); }

export function firebaseAppCheck() {
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
  if (!siteKey || typeof window === 'undefined') return null;
  const globalWindow = window as OpsiqoWindow;
  if (globalWindow[APP_CHECK_KEY]) return globalWindow[APP_CHECK_KEY]!;
  const instance = initializeAppCheck(firebaseClientApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  globalWindow[APP_CHECK_KEY] = instance;
  return instance;
}
