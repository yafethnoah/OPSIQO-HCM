import { adminDb } from '../src/lib/firebase/admin';
import type { Assignment, Position } from '../src/domain/hr';

const orgId = process.env.OPSIQO_DEMO_ORG_ID || process.env.OPSIQO_ORG_ID;
if (!orgId) throw new Error('Set OPSIQO_ORG_ID (or OPSIQO_DEMO_ORG_ID) before rebuilding occupancy.');
const db = adminDb();
const date = new Date().toISOString().slice(0, 10);
const timestamp = new Date().toISOString();
const assignmentFte = (a: Assignment) => Number(a.allocationFte ?? (a.primary ? 1 : 0.25));

async function main() {
  const [positionSnap, assignmentSnap] = await Promise.all([
    db.collection(`organizations/${orgId}/positions`).get(),
    db.collection(`organizations/${orgId}/assignments`).get(),
  ]);
  const counts = new Map<string, { headcount: number; fte: number }>();
  for (const doc of assignmentSnap.docs) {
    const a = doc.data() as Assignment;
    if (a.startDate <= date && (!a.endDate || a.endDate >= date)) {
      const current = counts.get(a.positionId) || { headcount: 0, fte: 0 };
      counts.set(a.positionId, { headcount: current.headcount + 1, fte: current.fte + assignmentFte(a) });
    }
  }

  let batch = db.batch();
  let writes = 0;
  let updated = 0;
  for (const doc of positionSnap.docs) {
    const p = doc.data() as Position;
    const occupied = counts.get(p.id) || { headcount: 0, fte: 0 };
    batch.set(db.doc(`organizations/${orgId}/positionOccupancy/${p.id}`), {
      positionId: p.id,
      occupiedHeadcount: occupied.headcount,
      occupiedFte: Number(occupied.fte.toFixed(2)),
      updatedAt: timestamp,
    }, { merge: true });
    writes++;
    if (!['planned', 'frozen', 'closed'].includes(p.status)) {
      batch.update(doc.ref, { status: occupied.headcount >= p.headcountLimit ? 'filled' : 'open', updatedAt: timestamp });
      writes++;
    }
    updated++;
    if (writes >= 400) { await batch.commit(); batch = db.batch(); writes = 0; }
  }
  if (writes) await batch.commit();
  console.log(`Rebuilt headcount + FTE occupancy for ${updated} positions in ${orgId}.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
