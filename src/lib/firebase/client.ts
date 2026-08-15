'use client';

import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';

const APP_CHECK_KEY = '__opsiqoAppCheck';
const AUTH_EMULATOR_KEY = '__opsiqoAuthEmulatorConnected';

type OpsiqoWindow = Window & {
  [APP_CHECK_KEY]?: AppCheck;
  [AUTH_EMULATOR_KEY]?: boolean;
};

type DebugGlobal = typeof globalThis & {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
};

function firebaseEmulatorMode(): boolean {
  if (process.env.NEXT_PUBLIC_OPSIQO_USE_FIREBASE_EMULATORS === 'true') return true;

  // Development fallback for the dedicated OPSIQO local demo project. This
  // makes local Auth bootstrap resilient if a dev bundler/module refresh
  // fails to preserve one NEXT_PUBLIC flag, without ever enabling emulators
  // for a production build or a non-demo Firebase project.
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return false;

  const host = window.location.hostname;
  const localHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  return localHost && projectId === 'demo-opsiqo-local';
}

function configuredFirebaseOptions(): FirebaseOptions {
  if (firebaseEmulatorMode()) {
    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      'demo-opsiqo-local';

    return {
      // The Auth emulator still requires a syntactically present web config.
      // These local-only values are never used to authenticate to Google APIs.
      // Explicit local emulator values. Do not inherit stale/cloud Firebase web
      // credentials from the parent shell or .env files while emulator mode is on.
      apiKey: 'demo-api-key',
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: '1234567890',
      appId: '1:1234567890:web:opsiqo-local',
    };
  }

  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  };

  const missing = [
    ['NEXT_PUBLIC_FIREBASE_API_KEY', config.apiKey],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', config.authDomain],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', config.projectId],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', config.appId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `[OPSIQO-FIREBASE] Missing client configuration: ${missing.join(', ')}. ` +
        'For local development start the Firebase emulators with `npm run dev:backend` ' +
        'and start OPSIQO with `npm run dev:frontend`. For cloud development, provide the real Firebase web configuration.',
    );
  }

  return config;
}

/*
 * Configure localhost debug attestation BEFORE App Check initialization.
 * Public/production hosts never enter this branch. App Check is not initialized
 * at all while the explicit local emulator mode is enabled.
 */
if (typeof window !== 'undefined' && !firebaseEmulatorMode()) {
  const host = window.location.hostname;

  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1';

  const explicitDebugToken =
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim();

  if (isLocal && explicitDebugToken) {
    (globalThis as DebugGlobal).FIREBASE_APPCHECK_DEBUG_TOKEN =
      explicitDebugToken;

    console.info(
      '[OPSIQO-APPCHECK] EXPLICIT LOCAL DEBUG TOKEN CONFIGURED',
    );
  }
}

function clientAppName(options: FirebaseOptions): string {
  const projectId = String(options.projectId || 'unknown-project')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 80);

  // Never reuse an unrelated/default Firebase app. During Next.js Fast Refresh
  // Firebase's app registry can outlive a module reload; reusing getApps()[0]
  // can therefore bind Auth to stale configuration from a previous runtime.
  return firebaseEmulatorMode()
    ? `opsiqo-local-${projectId}`
    : `opsiqo-cloud-${projectId}`;
}

function existingClientApp(name: string): FirebaseApp | undefined {
  return getApps().find((app) => app.name === name);
}

export function firebaseClientApp() {
  const options = configuredFirebaseOptions();
  const name = clientAppName(options);
  const existing = existingClientApp(name);

  if (existing) return existing;

  const app = initializeApp(options, name);

  if (typeof window !== 'undefined' && firebaseEmulatorMode()) {
    console.info('[OPSIQO-FIREBASE] Initialized isolated local Firebase client app', {
      appName: name,
      projectId: options.projectId,
      apiKeyPresent: Boolean(options.apiKey),
    });
  }

  return app;
}

function connectLocalAuth(auth: Auth) {
  if (typeof window === 'undefined' || !firebaseEmulatorMode()) return;

  const globalWindow = window as OpsiqoWindow;
  if (globalWindow[AUTH_EMULATOR_KEY]) return;

  const url =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL?.trim() ||
    'http://127.0.0.1:9099';

  // connectAuthEmulator must run before any Auth network operation.
  connectAuthEmulator(auth, url, { disableWarnings: true });
  globalWindow[AUTH_EMULATOR_KEY] = true;

  console.info('[OPSIQO-AUTH] Connected to local Firebase Auth emulator', {
    url,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-opsiqo-local',
  });
}

export function firebaseClientRuntimeInfo() {
  const options = configuredFirebaseOptions();
  return {
    emulatorMode: firebaseEmulatorMode(),
    projectId: String(options.projectId || ''),
    appName: clientAppName(options),
    apiKeyPresent: Boolean(options.apiKey),
    apiKeyShapeValid: Boolean(options.apiKey && !String(options.apiKey).includes(':')),
  };
}

export function firebaseAuth() {
  const app = firebaseClientApp();
  const runtime = firebaseClientRuntimeInfo();

  if (!runtime.apiKeyPresent || !runtime.apiKeyShapeValid) {
    throw new Error(
      `[OPSIQO-FIREBASE] Refusing to initialize Auth with invalid client configuration. ` +
        `mode=${runtime.emulatorMode ? 'emulator' : 'cloud'} project=${runtime.projectId || 'missing'} app=${runtime.appName}`,
    );
  }

  const auth = getAuth(app);
  connectLocalAuth(auth);
  return auth;
}

export function firebaseAppCheck() {
  if (typeof window === 'undefined' || firebaseEmulatorMode()) return null;

  const siteKey =
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim();

  if (!siteKey) {
    console.warn('[OPSIQO-APPCHECK] Enterprise site key missing.');
    return null;
  }

  const globalWindow = window as OpsiqoWindow;

  if (globalWindow[APP_CHECK_KEY]) {
    return globalWindow[APP_CHECK_KEY]!;
  }

  console.info('[OPSIQO-APPCHECK] Initializing App Check', {
    hostname: window.location.hostname,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    debugTokenConfigured:
      typeof (globalThis as DebugGlobal).FIREBASE_APPCHECK_DEBUG_TOKEN ===
      'string',
  });

  const instance = initializeAppCheck(firebaseClientApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  globalWindow[APP_CHECK_KEY] = instance;

  return instance;
}
