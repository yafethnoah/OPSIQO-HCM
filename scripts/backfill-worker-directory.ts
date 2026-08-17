import { adminDb } from '@/lib/firebase/admin';
import { workerDirectoryEntry } from '@/lib/hr/directory';
import type { Worker } from '@/domain/hr';

async function main() {
  const orgId = String(process.argv[2] || '').trim();
  if (!orgId) throw new Error('Usage: npm run directory:backfill -- <orgId>');
  const db = adminDb();
  const workers = await db.collection(`organizations/${orgId}/workers`).get();
  let batch = db.batch();
  let pending = 0;
  let written = 0;
  for (const snap of workers.docs) {
    const worker = snap.data() as Worker;
    batch.set(db.doc(`organizations/${orgId}/workerDirectory/${snap.id}`), workerDirectoryEntry(worker), { merge: true });
    pending += 1;
    written += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending) await batch.commit();
  console.log(JSON.stringify({ status: 'PASS', orgId, workers: workers.size, directoryEntriesWritten: written }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
