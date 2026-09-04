import { createHash, randomUUID } from 'crypto';
import type { ActorContext, Permission } from '@/domain/security';
import type { MobileBootstrap, MobileDeviceRegistration } from '@/domain/mobile';
import { adminDb } from '@/lib/firebase/admin';
import { buildAudit } from '@/lib/audit/service';
import { ApiError } from '@/lib/http/errors';
import { superAppDashboard } from '@/lib/superapp/service';
import { getLeaveWorkspace } from '@/lib/time/service';
import { expenseWorkspace, listShifts, liveAttendance } from '@/lib/time/frontline-service';
import { listNotifications } from '@/lib/notifications/service';
import { learningDashboard } from '@/lib/learning/service';
import { listEmployeeDocuments } from '@/lib/compliance/service';
import { mobileDeviceSchema } from './schemas';

const now = () => new Date().toISOString();
const deviceId = (installationId:string) => createHash('sha256').update(installationId).digest('hex').slice(0,48);

export async function mobileBootstrap(actor: ActorContext): Promise<MobileBootstrap> {
  if (!actor.permissions.includes('self.read')) throw new ApiError(403, 'Employee self-service permission required.', 'forbidden');

  const home = await superAppDashboard(actor);
  const workerId = actor.workerId;
  const can = (permission:string) => actor.permissions.includes(permission as Permission);

  const [leave, shifts, attendance, expenses, notifications, learning, documents] = await Promise.all([
    workerId && can('leave.read') ? getLeaveWorkspace(actor, workerId).catch(() => null) : Promise.resolve(null),
    workerId && can('time.read') ? listShifts(actor, undefined, undefined, workerId).catch(() => []) : Promise.resolve([]),
    workerId && can('time.read') ? liveAttendance(actor).catch(() => null) : Promise.resolve(null),
    can('expense.read') ? expenseWorkspace(actor).catch(() => []) : Promise.resolve([]),
    can('notifications.read') ? listNotifications(actor, 30).catch(() => []) : Promise.resolve([]),
    can('learning.read') ? learningDashboard(actor).catch(() => null) : Promise.resolve(null),
    workerId && can('documents.read') ? listEmployeeDocuments(actor, workerId).catch(() => []) : Promise.resolve([]),
  ]);

  return {
    apiVersion: 'v1',
    release: { featureRelease: 'H47', mobileRelease: 'employee-mobile-v1.1' },
    actor,
    capabilities: {
      employeePortal: true,
      time: can('time.read'),
      clock: can('time.clock'),
      leave: can('leave.read') || can('leave.request'),
      expenses: can('expense.read') || can('expense.request'),
      learning: can('learning.read'),
      documents: can('documents.read'),
      notifications: can('notifications.read'),
      safety: can('safety.report'),
      aiCopilot: can('ai.use'),
      managerMode: actor.role === 'manager' || actor.permissions.includes('time.manage.team'),
    },
    employee: home.employee,
    attention: Array.isArray(home.attention) ? home.attention.slice(0, 12) : [],
    leave,
    shifts,
    attendance,
    expenses,
    notifications,
    learning,
    documents,
    manager: home.manager || null,
    team: Array.isArray(home.team) ? home.team : [],
    generatedAt: now(),
  };
}

export async function registerMobileDevice(actor:ActorContext, raw:unknown) {
  const input = mobileDeviceSchema.parse(raw);
  const id = deviceId(input.installationId);
  const ref = adminDb().doc(`organizations/${actor.orgId}/mobileDevices/${id}`);
  const snap = await ref.get();
  const before = snap.exists ? (snap.data() as MobileDeviceRegistration) : null;
  if (before && before.uid !== actor.uid) throw new ApiError(409, 'This mobile installation is already registered to another user.', 'mobile_installation_conflict');
  const timestamp = now();
  const row:MobileDeviceRegistration = {
    id,
    uid: actor.uid,
    workerId: actor.workerId,
    platform: input.platform,
    pushToken: input.pushToken,
    appVersion: input.appVersion,
    osVersion: input.osVersion,
    deviceModel: input.deviceModel,
    biometricCapable: input.biometricCapable,
    notificationsGranted: input.notificationsGranted,
    status: 'active',
    lastSeenAt: timestamp,
    createdAt: before?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const audit = buildAudit(actor, {
    action: before ? 'mobile.device.refresh' : 'mobile.device.register',
    entityType: 'mobileDevice',
    entityId: id,
    before: before ? { ...before, pushToken: before.pushToken ? '[redacted]' : undefined } : null,
    after: { ...row, pushToken: row.pushToken ? '[redacted]' : undefined },
  });
  const batch = adminDb().batch();
  batch.set(ref, row, { merge: false });
  batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return { id, status: row.status, updatedAt: row.updatedAt };
}

export async function revokeMobileDevice(actor:ActorContext, installationId:string) {
  const id = deviceId(installationId);
  const ref = adminDb().doc(`organizations/${actor.orgId}/mobileDevices/${id}`);
  const snap = await ref.get();
  if (!snap.exists) return { id, status: 'revoked' as const, alreadyAbsent: true };
  const before = snap.data() as MobileDeviceRegistration;
  if (before.uid !== actor.uid && !actor.permissions.includes('organization.manage')) throw new ApiError(403, 'You cannot revoke another user mobile device.', 'forbidden');
  const timestamp = now();
  const after = { ...before, status: 'revoked' as const, pushToken: undefined, updatedAt: timestamp, lastSeenAt: timestamp };
  const audit = buildAudit(actor, { action: 'mobile.device.revoke', entityType: 'mobileDevice', entityId: id, before: { ...before, pushToken: before.pushToken ? '[redacted]' : undefined }, after: { ...after, pushToken: undefined } });
  const batch = adminDb().batch();
  batch.set(ref, after, { merge: false });
  batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return { id, status: after.status, updatedAt: timestamp };
}
