import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { BreakEvent, TimeEntry, TimePolicy, Timesheet, WorkerTimeProfile } from '@/domain/time';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { buildDomainEvent } from '@/lib/events/build';
import { buildAttendanceLocationStatus } from './attendance-map';
import { exactMinutesBetween, exactWorkedMinutes } from './precision';

export type AttendanceIntegrityState =
  | 'normal'
  | 'overdue_open_shift'
  | 'critical_open_shift';

export interface AttendanceIntegrityAssessment {
  entryId: string;
  workerId: string;
  state: AttendanceIntegrityState;
  requiresReview: boolean;
  payrollBlocked: boolean;
  elapsedMinutes: number;
  thresholdMinutes: number;
  overdueMinutes: number;
  criticalThresholdMinutes: number;
  workDate: string;
  policyId?: string;
  message: string;
}

export const adminClockOutSchema = z.object({
  workerId: z.string().min(1),
  entryId: z.string().min(1),
  clockOutAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(10).max(500),
  confirm: z.literal(true),
});

const ADMIN_ROLES = new Set(['super_admin', 'org_admin', 'hr_admin']);
const nowIso = () => new Date().toISOString();
const positive = (n: unknown) =>
  Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : undefined;
const exceptionId = (workerId: string, type: string, scope: string) =>
  createHash('sha256')
    .update(`${workerId}|${type}|${scope}`)
    .digest('hex')
    .slice(0, 40);

function dateInZone(iso: string, timezone = 'UTC') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(iso));
    const pick = (type: string) =>
      parts.find((p) => p.type === type)?.value || '';
    return `${pick('year')}-${pick('month')}-${pick('day')}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export function assessAttendanceIntegrity(
  entry: Pick<TimeEntry, 'id' | 'workerId' | 'startAt' | 'status'>,
  policy?: Pick<
    TimePolicy,
    'id' | 'timezone' | 'maxDailyHours' | 'standardDailyHours'
  >,
  profile?: Pick<WorkerTimeProfile, 'standardDailyHours'>,
  at = nowIso(),
): AttendanceIntegrityAssessment {
  const policyMax = positive(policy?.maxDailyHours);
  const profileDaily = positive(profile?.standardDailyHours);
  const policyDaily = positive(policy?.standardDailyHours);
  const thresholdHours = policyMax ?? profileDaily ?? policyDaily ?? 12;
  const thresholdMinutes = Math.max(60, Math.round(thresholdHours * 60));
  const elapsedMinutes = Math.max(0, exactMinutesBetween(entry.startAt, at));
  const overdueMinutes = Math.max(0, elapsedMinutes - thresholdMinutes);
  const criticalThresholdMinutes = Math.max(
    24 * 60,
    thresholdMinutes + 4 * 60,
  );
  const requiresReview =
    entry.status === 'open' && elapsedMinutes > thresholdMinutes;
  const state: AttendanceIntegrityState = !requiresReview
    ? 'normal'
    : elapsedMinutes >= criticalThresholdMinutes
      ? 'critical_open_shift'
      : 'overdue_open_shift';

  return {
    entryId: entry.id,
    workerId: entry.workerId,
    state,
    requiresReview,
    payrollBlocked: requiresReview,
    elapsedMinutes,
    thresholdMinutes,
    overdueMinutes,
    criticalThresholdMinutes,
    workDate: dateInZone(entry.startAt, policy?.timezone || 'UTC'),
    policyId: policy?.id,
    message:
      state === 'critical_open_shift'
        ? 'Open shift is critically overdue and requires administrator review before it can be closed.'
        : state === 'overdue_open_shift'
          ? 'Open shift exceeded the configured daily threshold and requires administrator review.'
          : 'Open shift is within the configured attendance threshold.',
  };
}

async function loadIntegrityContext(orgId: string) {
  const db = adminDb();
  const [profiles, policies] = await Promise.all([
    db.collection(`organizations/${orgId}/workerTimeProfiles`).limit(4000).get(),
    db.collection(`organizations/${orgId}/timePolicies`).limit(1000).get(),
  ]);
  return {
    profiles: new Map(
      profiles.docs.map((d) => [d.id, d.data() as WorkerTimeProfile]),
    ),
    policies: new Map(
      policies.docs.map((d) => [d.id, d.data() as TimePolicy]),
    ),
  };
}

export async function assessAttendanceEntries(
  orgId: string,
  entries: TimeEntry[],
  at = nowIso(),
) {
  const { profiles, policies } = await loadIntegrityContext(orgId);
  const result = new Map<string, AttendanceIntegrityAssessment>();
  for (const entry of entries) {
    const profile = profiles.get(entry.workerId);
    const policy = profile ? policies.get(profile.timePolicyId) : undefined;
    result.set(
      entry.id,
      assessAttendanceIntegrity(entry, policy, profile, at),
    );
  }
  return result;
}

export async function attendanceIntegrityForWorkerWeek(
  orgId: string,
  workerId: string,
  weekStart: string,
  weekEnd: string,
) {
  const db = adminDb();
  const open = await db
    .collection(`organizations/${orgId}/timeEntries`)
    .where('workerId', '==', workerId)
    .where('status', '==', 'open')
    .get();
  const entries = open.docs.map((d) => d.data() as TimeEntry);
  if (!entries.length) return undefined;
  const assessments = await assessAttendanceEntries(orgId, entries);
  return entries
    .map((e) => assessments.get(e.id))
    .find(
      (x) =>
        x?.requiresReview &&
        x.workDate >= weekStart &&
        x.workDate <= weekEnd,
    );
}

export async function payrollAttendanceIntegrityBlockers(
  orgId: string,
  workerIds: string[],
) {
  const wanted = new Set(workerIds);
  const open = await adminDb()
    .collection(`organizations/${orgId}/timeEntries`)
    .where('status', '==', 'open')
    .get();
  const entries = open.docs
    .map((d) => d.data() as TimeEntry)
    .filter((e) => wanted.has(e.workerId));
  const assessments = await assessAttendanceEntries(orgId, entries);
  const byWorker = new Map<string, AttendanceIntegrityAssessment>();
  for (const entry of entries) {
    const assessment = assessments.get(entry.id);
    if (!assessment?.requiresReview) continue;
    const prior = byWorker.get(entry.workerId);
    if (!prior || assessment.overdueMinutes > prior.overdueMinutes) {
      byWorker.set(entry.workerId, assessment);
    }
  }
  return byWorker;
}

export async function adminClockOut(actor: ActorContext, raw: unknown) {
  if (!ADMIN_ROLES.has(actor.role)) {
    throw new ApiError(
      403,
      'Administrator role is required to clock out another employee.',
      'admin_clock_out_forbidden',
    );
  }
  if (
    !actor.permissions.includes('time.manage') &&
    !actor.permissions.includes('time.manage.team')
  ) {
    throw new ApiError(
      403,
      'Time management permission is required.',
      'forbidden',
    );
  }

  const input = adminClockOutSchema.parse(raw);
  const db = adminDb();
  const entryRef = db.doc(
    `organizations/${actor.orgId}/timeEntries/${input.entryId}`,
  );
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) {
    throw new ApiError(
      404,
      'Open attendance entry not found.',
      'time_entry_not_found',
    );
  }

  const before = entrySnap.data() as TimeEntry;
  if (
    before.workerId !== input.workerId ||
    before.status !== 'open' ||
    before.endAt
  ) {
    throw new ApiError(
      409,
      'The selected attendance entry is no longer open for correction.',
      'clock_state_invalid',
    );
  }

  const clockOutAtMs = Date.parse(input.clockOutAt);
  const startAtMs = Date.parse(before.startAt);
  if (!Number.isFinite(clockOutAtMs) || clockOutAtMs <= startAtMs) {
    throw new ApiError(
      400,
      'Clock-out time must be after the employee clock-in time.',
      'admin_clock_out_time_invalid',
    );
  }
  if (clockOutAtMs > Date.now() + 2 * 60 * 1000) {
    throw new ApiError(
      400,
      'Clock-out time cannot be in the future.',
      'admin_clock_out_future',
    );
  }

  const profileSnap = await db
    .doc(`organizations/${actor.orgId}/workerTimeProfiles/${input.workerId}`)
    .get();
  const profile = profileSnap.exists
    ? (profileSnap.data() as WorkerTimeProfile)
    : undefined;
  const policySnap = profile
    ? await db
        .doc(
          `organizations/${actor.orgId}/timePolicies/${profile.timePolicyId}`,
        )
        .get()
    : undefined;
  const policy = policySnap?.exists
    ? (policySnap.data() as TimePolicy)
    : undefined;
  const assessment = assessAttendanceIntegrity(
    before,
    policy,
    profile,
    nowIso(),
  );
  const workDate = dateInZone(
    before.startAt,
    policy?.timezone || 'UTC',
  );

  const timesheetSnap = await db
    .collection(`organizations/${actor.orgId}/timesheets`)
    .where('workerId', '==', input.workerId)
    .get();
  const affectedTimesheets = timesheetSnap.docs
    .map((d) => ({ ref: d.ref, row: d.data() as Timesheet }))
    .filter(
      ({ row }) =>
        row.weekStart <= workDate && row.weekEnd >= workDate,
    );

  if (
    affectedTimesheets.some(
      ({ row }) =>
        row.status === 'approved' ||
        (row.status as string) === 'locked',
    )
  ) {
    throw new ApiError(
      409,
      'This attendance period is already approved or locked. Use the governed time/payroll correction workflow instead of changing the punch.',
      'attendance_locked_correction_required',
    );
  }

  const breakSnap = await db
    .collection(`organizations/${actor.orgId}/breakEvents`)
    .where('timeEntryId', '==', before.id)
    .get();
  const activeBreak = breakSnap.docs
    .map((d) => ({
      ref: d.ref,
      row: d.data() as BreakEvent,
    }))
    .filter(({ row }) => !row.endAt)
    .sort((a, b) => b.row.startAt.localeCompare(a.row.startAt))[0];

  let breakMinutes = before.breakMinutes || 0;
  let closedBreak: BreakEvent | undefined;
  if (activeBreak) {
    if (clockOutAtMs <= Date.parse(activeBreak.row.startAt)) {
      throw new ApiError(
        400,
        'Clock-out time must be after the active break start time.',
        'admin_clock_out_before_break',
      );
    }
    const minutes = exactMinutesBetween(
      activeBreak.row.startAt,
      input.clockOutAt,
    );
    closedBreak = {
      ...activeBreak.row,
      endAt: input.clockOutAt,
      minutes,
      updatedAt: nowIso(),
    };
    if (!activeBreak.row.paid) breakMinutes += minutes;
  }

  const timestamp = nowIso();
  const workedMinutes = exactWorkedMinutes(
    before.startAt,
    input.clockOutAt,
    breakMinutes,
  );
  const after: TimeEntry = {
    ...before,
    endAt: input.clockOutAt,
    breakMinutes,
    workedMinutes,
    status: 'corrected',
    breakState: 'working',
    updatedAt: timestamp,
  };

  const correctionId = randomUUID();
  const correction = {
    id: correctionId,
    orgId: actor.orgId,
    workerId: input.workerId,
    timeEntryId: before.id,
    correctionType: 'admin_manual_clock_out',
    originalEntry: before,
    correctedEntry: after,
    clockOutAt: input.clockOutAt,
    reason: input.reason,
    originalElapsedMinutesAtReview: assessment.elapsedMinutes,
    policyThresholdMinutes: assessment.thresholdMinutes,
    overdueMinutesAtReview: assessment.overdueMinutes,
    integrityStateAtReview: assessment.state,
    correctedBy: actor.uid,
    correctedByRole: actor.role,
    correctedAt: timestamp,
    locationEvidence: 'not_fabricated',
  };

  const audit = buildAudit(actor, {
    action: 'time.admin_clock_out',
    entityType: 'timeEntry',
    entityId: before.id,
    before,
    after,
    metadata: {
      correctionId,
      workerId: input.workerId,
      reason: input.reason,
      clockOutAt: input.clockOutAt,
      integrityState: assessment.state,
    },
  });
  const event = buildDomainEvent(
    actor,
    'time.exception',
    'timeEntry',
    before.id,
    {
      workerId: input.workerId,
      action: 'admin_clock_out',
      correctionId,
      clockOutAt: input.clockOutAt,
      reason: input.reason,
    },
  );

  const missingClockOutId = exceptionId(
    input.workerId,
    'missing_clock_out',
    `${workDate}:${before.id}`,
  );
  const missingClockOutRef = db.doc(
    `organizations/${actor.orgId}/timeExceptions/${missingClockOutId}`,
  );
  const missingClockOutSnap = await missingClockOutRef.get();

  const batch = db.batch();
  batch.set(entryRef, after, { merge: false });
  batch.create(
    db.doc(
      `organizations/${actor.orgId}/attendanceCorrections/${correctionId}`,
    ),
    correction,
  );
  batch.create(
    db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),
    audit,
  );
  batch.create(
    db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`),
    event,
  );

  if (closedBreak && activeBreak) {
    batch.set(activeBreak.ref, closedBreak, { merge: false });
  }

  for (const { ref, row } of affectedTimesheets) {
    if (row.status !== 'draft') {
      batch.set(
        ref,
        {
          status: 'draft',
          approvedAt: null,
          approvedBy: null,
          approvedByRole: null,
          approvedByWorkerId: null,
          approvalNote: null,
          updatedAt: timestamp,
        },
        { merge: true },
      );
    }
  }

  if (missingClockOutSnap.exists) {
    batch.set(
      missingClockOutRef,
      {
        status: 'resolved',
        updatedAt: timestamp,
        resolvedAt: timestamp,
        resolvedBy: actor.uid,
        resolutionNote: input.reason,
      },
      { merge: true },
    );
  }

  // Never invent the employee's clock-out location for an admin correction.
  batch.set(
    db.doc(
      `organizations/${actor.orgId}/attendanceLocationStatus/${input.workerId}`,
    ),
    buildAttendanceLocationStatus({
      workerId: input.workerId,
      event: 'clock_out',
      eventAt: input.clockOutAt,
      evidence: undefined,
      updatedAt: timestamp,
    }),
    { merge: false },
  );

  await batch.commit();

  return {
    correction,
    entry: after,
    workerId: input.workerId,
    workDate,
    timesheetResetToDraft: affectedTimesheets.filter(
      ({ row }) => row.status !== 'draft',
    ).length,
    activeBreakClosed: Boolean(closedBreak),
  };
}