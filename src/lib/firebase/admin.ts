import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let configuredDb: Firestore | null = null;

function privateKey() { return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'); }

export function getAdminApp() {
  if (getApps().length) return getApps()[0]!;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required.');
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) return initializeApp({ projectId });
  const authMode = String(process.env.OPSIQO_FIREBASE_ADMIN_AUTH_MODE || 'service_account').trim().toLowerCase();
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (authMode === 'adc') return initializeApp({ credential: applicationDefault(), projectId, storageBucket });
  if (authMode !== 'service_account') throw new Error('OPSIQO_FIREBASE_ADMIN_AUTH_MODE must be service_account or adc.');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL; const key = privateKey();
  if (!clientEmail || !key) throw new Error('Firebase Admin service-account credentials are not configured.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }), projectId, storageBucket });
}
export function adminAuth() { return getAuth(getAdminApp()); }
export function adminAppCheck() { return getAppCheck(getAdminApp()); }
export function adminDb() {
  if (!configuredDb) { configuredDb = getFirestore(getAdminApp()); configuredDb.settings({ ignoreUndefinedProperties: true }); }
  return configuredDb;
}

export function adminBucket() { const bucketName=process.env.FIREBASE_STORAGE_BUCKET||process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET; if(!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET is required for document uploads.'); return getStorage(getAdminApp()).bucket(bucketName); }
