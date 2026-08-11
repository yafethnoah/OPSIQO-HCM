import { createHash } from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const databaseId = String(process.env.OPSIQO_DR_RESTORE_DATABASE_ID || '').trim();
const path = String(process.env.OPSIQO_DR_SENTINEL_DOCUMENT_PATH || '').trim();
const expected = String(process.env.OPSIQO_DR_SENTINEL_EXPECTED_SHA256 || '').trim().toLowerCase();
if (!databaseId) throw new Error('OPSIQO_DR_RESTORE_DATABASE_ID is required.');
const segments = path.split('/').filter(Boolean);
if (segments.length < 2 || segments.length % 2 !== 0 || segments.join('/') !== path) throw new Error('OPSIQO_DR_SENTINEL_DOCUMENT_PATH must be an even-segment Firestore document path.');
if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('OPSIQO_DR_SENTINEL_EXPECTED_SHA256 must be a SHA-256 hex digest.');

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
  return value;
}

const projectId = String(process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '').trim();
if (!projectId) throw new Error('FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT is required.');
if (!getApps().length) {
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  initializeApp({
    projectId,
    credential: clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault(),
  });
}
const app = getApps()[0]!;
const db = getFirestore(app, databaseId);
const snapshot = await db.doc(path).get();
if (!snapshot.exists) throw new Error(`Restore sentinel does not exist at ${path}.`);
const actual = createHash('sha256').update(JSON.stringify(stable(snapshot.data()))).digest('hex');
if (actual !== expected) throw new Error(`Restore sentinel SHA-256 mismatch: observed ${actual}.`);
console.log(JSON.stringify({ databaseId, documentPath: path, sentinelSha256: actual, verified: true, verifiedAt: new Date().toISOString() }));
