import type { ActorContext } from '@/domain/security';
import type { Worker } from '@/domain/hr';
import type { TimeEntry } from '@/domain/time';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import {
  attendanceLocationStatusFromTimeEntry,
  attendanceStatusHasCoordinates,
  type AttendanceLocationStatus,
} from './attendance-map';

const mapViewerRoles = new Set([
  'super_admin',
  'org_admin',
  'hr_admin',
  'hr_partner',
]);

const mapBackfillRoles = new Set([
  'super_admin',
  'org_admin',
  'hr_admin',
]);

export interface StaffAttendanceMapRow {
  workerId: string;
  workerName: string;
  employeeNumber: string;
  attendanceStatus: 'clocked_in' | 'on_break' | 'clocked_out';
  lastEvent: 'clock_in' | 'clock_out' | null;
  lastEventAt: string | null;
  hasLocation: boolean;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt?: string;
  source?: string;
  locationId?: string;
  insideGeofence?: boolean;
  deviceVerification?: string;
  integrityRisk?: string;
}

export interface StaffAttendanceMapResponse {
  generatedAt: string;
  totalStaff: number;
  withLocation: number;
  withoutLocation: number;
  clockedIn: number;
  onBreak: number;
  staff: StaffAttendanceMapRow[];
  privacy: {
    purpose: 'time_and_attendance';
    trackingMode: 'clock_event_only';
    continuousTracking: false;
    statement: string;
  };
}

export async function staffAttendanceMap(
  actor: ActorContext,
): Promise<StaffAttendanceMapResponse> {
  requireMapViewer(actor);

  const db = adminDb();

  const [workersSnap, statusSnap, openSnap] = await Promise.all([
    db
      .collection(`organizations/${actor.orgId}/workers`)
      .where('status', 'in', ['active', 'leave'])
      .limit(500)
      .get(),
    db
      .collection(`organizations/${actor.orgId}/attendanceLocationStatus`)
      .get(),
    db
      .collection(`organizations/${actor.orgId}/timeEntries`)
      .where('status', '==', 'open')
      .get(),
  ]);

  const workers = workersSnap.docs.map((doc) => doc.data() as Worker);

  const statusByWorker = new Map<string, AttendanceLocationStatus>(
    statusSnap.docs.map((doc) => [
      doc.id,
      doc.data() as AttendanceLocationStatus,
    ]),
  );

  const openByWorker = new Map<string, TimeEntry>();
  for (const doc of openSnap.docs) {
    const entry = doc.data() as TimeEntry;
    const current = openByWorker.get(entry.workerId);

    if (!current || entry.updatedAt > current.updatedAt) {
      openByWorker.set(entry.workerId, entry);
    }

    if (!statusByWorker.has(entry.workerId) && entry.startEvidence) {
      statusByWorker.set(
        entry.workerId,
        attendanceLocationStatusFromTimeEntry(entry),
      );
    }
  }

  const staff: StaffAttendanceMapRow[] = workers
    .map((worker) => {
      const openEntry = openByWorker.get(worker.id);
      const status = statusByWorker.get(worker.id);
      const hasLocation = attendanceStatusHasCoordinates(status);

      const attendanceStatus: StaffAttendanceMapRow['attendanceStatus'] =
        openEntry?.breakState === 'on_break'
          ? 'on_break'
          : openEntry
            ? 'clocked_in'
            : 'clocked_out';

      return {
        workerId: worker.id,
        workerName: worker.displayName,
        employeeNumber: worker.employeeNumber ?? '',
        attendanceStatus,
        lastEvent: status?.lastEvent ?? null,
        lastEventAt: status?.lastEventAt ?? null,
        hasLocation,
        latitude: hasLocation ? status.latitude : undefined,
        longitude: hasLocation ? status.longitude : undefined,
        accuracyMeters: hasLocation ? status.accuracyMeters : undefined,
        capturedAt: hasLocation ? status.capturedAt : undefined,
        source: hasLocation ? status.source : undefined,
        locationId: hasLocation ? status.locationId : undefined,
        insideGeofence: hasLocation ? status.insideGeofence : undefined,
        deviceVerification: hasLocation
          ? status.deviceVerification
          : undefined,
        integrityRisk: hasLocation ? status.integrityRisk : undefined,
      };
    })
    .sort((a, b) => a.workerName.localeCompare(b.workerName));

  return {
    generatedAt: new Date().toISOString(),
    totalStaff: staff.length,
    withLocation: staff.filter((row) => row.hasLocation).length,
    withoutLocation: staff.filter((row) => !row.hasLocation).length,
    clockedIn: staff.filter((row) => row.attendanceStatus === 'clocked_in')
      .length,
    onBreak: staff.filter((row) => row.attendanceStatus === 'on_break')
      .length,
    staff,
    privacy: {
      purpose: 'time_and_attendance',
      trackingMode: 'clock_event_only',
      continuousTracking: false,
      statement:
        'Locations shown here come from governed clock-in/clock-out attendance evidence. OPSIQO does not continuously or silently track employee devices.',
    },
  };
}

export async function backfillAttendanceMapStatus(
  actor: ActorContext,
): Promise<{
  scannedEntries: number;
  projectedWorkers: number;
  activeStaff: number;
  noHistoricalEntry: number;
  historyLimitReached: boolean;
}> {
  if (!actor.permissions.includes('time.configure')) {
    throw new ApiError(
      403,
      'Time configuration permission is required.',
      'forbidden',
    );
  }

  if (!mapBackfillRoles.has(actor.role)) {
    throw new ApiError(
      403,
      'Attendance-map initialization is limited to HR administrators.',
      'forbidden',
    );
  }

  const db = adminDb();

  const [workersSnap, entriesSnap] = await Promise.all([
    db
      .collection(`organizations/${actor.orgId}/workers`)
      .where('status', 'in', ['active', 'leave'])
      .limit(500)
      .get(),
    db
      .collection(`organizations/${actor.orgId}/timeEntries`)
      .orderBy('updatedAt', 'desc')
      .limit(5000)
      .get(),
  ]);

  const workerIds = new Set(workersSnap.docs.map((doc) => doc.id));
  const latestByWorker = new Map<string, AttendanceLocationStatus>();

  for (const doc of entriesSnap.docs) {
    const entry = doc.data() as TimeEntry;

    if (
      workerIds.has(entry.workerId) &&
      !latestByWorker.has(entry.workerId)
    ) {
      latestByWorker.set(
        entry.workerId,
        attendanceLocationStatusFromTimeEntry(entry),
      );
    }
  }

  const statuses = [...latestByWorker.values()];

  for (let index = 0; index < statuses.length; index += 400) {
    const batch = db.batch();

    for (const status of statuses.slice(index, index + 400)) {
      batch.set(
        db.doc(
          `organizations/${actor.orgId}/attendanceLocationStatus/${status.workerId}`,
        ),
        status,
        { merge: false },
      );
    }

    await batch.commit();
  }

  const audit = buildAudit(actor, {
    action: 'time.attendance_map.initialize',
    entityType: 'organization',
    entityId: actor.orgId,
    after: {
      scannedEntries: entriesSnap.size,
      projectedWorkers: statuses.length,
      activeStaff: workerIds.size,
      historyLimitReached: entriesSnap.size === 5000,
    },
  });

  await db
    .doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`)
    .create(audit);

  return {
    scannedEntries: entriesSnap.size,
    projectedWorkers: statuses.length,
    activeStaff: workerIds.size,
    noHistoricalEntry: Math.max(0, workerIds.size - statuses.length),
    historyLimitReached: entriesSnap.size === 5000,
  };
}

function requireMapViewer(actor: ActorContext): void {
  if (!actor.permissions.includes('time.read')) {
    throw new ApiError(
      403,
      'Time read permission is required.',
      'forbidden',
    );
  }

  if (!mapViewerRoles.has(actor.role)) {
    throw new ApiError(
      403,
      'Organization staff location maps are limited to authorized HR roles.',
      'forbidden',
    );
  }
}
