import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type {
  Assignment,
  EmployeeChange,
  Employment,
  Person,
  Position,
  PositionWithOccupancy,
  SecondaryAssignmentPlan,
  Worker,
  WorkerStatus,
  WorkerTimelineEvent,
} from '@/domain/hr';
import { FieldValue, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { buildDomainEvent } from '@/lib/events/build';
import { systemActor } from '@/lib/automation/system-actor';
import { getNotificationSettingsForOrg } from '@/lib/notifications/service';
import { employeeChangeSchema, employeeCreateSchema, orgUnitCreateSchema, positionCreateSchema, secondaryAssignmentCreateSchema, secondaryAssignmentEndSchema, secondaryAssignmentPlanActionSchema } from './schemas';
import { workerDirectoryEntry } from '@/lib/hr/directory';

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const previousDate = (date: string) => new Date(new Date(`${date}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
const isCurrent = (assignment: Assignment, date = today()) => assignment.startDate <= date && (!assignment.endDate || assignment.endDate >= date);
const assignmentFte = (assignment: Assignment) => Number(assignment.allocationFte ?? (assignment.primary ? 1 : 0.25));

export interface EmployeeListOptions { q?: string; pageSize?: number; cursor?: string; }

function encodeCursor(id: string) { return Buffer.from(id, 'utf8').toString('base64url'); }
function decodeCursor(cursor?: string) {
  if (!cursor) return undefined;
  try { return Buffer.from(cursor, 'base64url').toString('utf8'); } catch { throw new ApiError(400, 'Invalid employee cursor.', 'invalid_cursor'); }
}

export async function listEmployees(actor: ActorContext, options: EmployeeListOptions = {}) {
  const pageSize = Math.max(10, Math.min(Number(options.pageSize || 50), 100));
  const rawQuery = (options.q || '').trim().toLowerCase();
  const collection = adminDb().collection(`organizations/${actor.orgId}/workers`);
  let query: any = collection;
  let field = 'displayNameLower';
  let value = rawQuery;
  if (rawQuery.startsWith('#')) { field = 'employeeNumberLower'; value = rawQuery.slice(1).trim(); }
  else if (rawQuery.includes('@')) field = 'workEmailLower';
  if (value) query = query.where(field, '>=', value).where(field, '<=', `${value}\uf8ff`);
  query = query.orderBy(field, 'asc').limit(pageSize + 1);
  const cursorId = decodeCursor(options.cursor);
  if (cursorId) {
    const cursorSnap = await collection.doc(cursorId).get();
    if (!cursorSnap.exists) throw new ApiError(400, 'Employee cursor no longer exists.', 'stale_cursor');
    query = query.startAfter(cursorSnap);
  }
  const snap = await query.get();
  const docs = snap.docs.slice(0, pageSize);
  return {
    data: docs.map((d: any) => d.data()),
    nextCursor: snap.size > pageSize && docs.length ? encodeCursor(docs[docs.length - 1]!.id) : null,
    pageSize,
    searchMode: field === 'employeeNumberLower' ? 'employee_number' : field === 'workEmailLower' ? 'work_email' : 'display_name',
  };
}

export async function getEmployee(actor: ActorContext, workerId: string) {
  const db = adminDb();
  const workerSnap = await db.doc(`organizations/${actor.orgId}/workers/${workerId}`).get();
  if (!workerSnap.exists) throw new ApiError(404, 'Employee not found.', 'employee_not_found');
  const worker = workerSnap.data() as Worker;

  const [personSnap, employmentSnap, assignmentSnap, changesSnap, secondaryPlansSnap] = await Promise.all([
    db.doc(`organizations/${actor.orgId}/people/${worker.personId}`).get(),
    db.collection(`organizations/${actor.orgId}/employments`).where('workerId', '==', workerId).get(),
    db.collection(`organizations/${actor.orgId}/assignments`).where('workerId', '==', workerId).get(),
    db.collection(`organizations/${actor.orgId}/employeeChanges`).where('workerId', '==', workerId).get(),
    db.collection(`organizations/${actor.orgId}/secondaryAssignmentPlans`).where('workerId', '==', workerId).get(),
  ]);

  const person = personSnap.exists ? personSnap.data() as Person : null;
  const employments = employmentSnap.docs.map((d) => d.data() as Employment).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const assignments = assignmentSnap.docs.map((d) => d.data() as Assignment).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const changes = changesSnap.docs.map((d) => d.data() as EmployeeChange).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const secondaryPlans = secondaryPlansSnap.docs.map((d) => d.data() as SecondaryAssignmentPlan).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate));

  const positionIds = [...new Set([...assignments.map((a) => a.positionId), ...secondaryPlans.map(p=>p.positionId).filter(Boolean) as string[]])];
  const unitIds = [...new Set([...assignments.map((a) => a.orgUnitId), ...secondaryPlans.map(p=>p.orgUnitId).filter(Boolean) as string[]])];
  const managerIds = [...new Set([...assignments.map((a) => a.managerWorkerId).filter(Boolean) as string[], ...secondaryPlans.map(p=>p.managerWorkerId).filter(Boolean) as string[]])];
  const [positions, units, managers] = await Promise.all([
    Promise.all(positionIds.map(async (id) => (await db.doc(`organizations/${actor.orgId}/positions/${id}`).get()).data() || null)),
    Promise.all(unitIds.map(async (id) => (await db.doc(`organizations/${actor.orgId}/orgUnits/${id}`).get()).data() || null)),
    Promise.all(managerIds.map(async (id) => (await db.doc(`organizations/${actor.orgId}/workers/${id}`).get()).data() || null)),
  ]);
  const positionMap = Object.fromEntries(positions.filter(Boolean).map((p: any) => [p.id, p]));
  const unitMap = Object.fromEntries(units.filter(Boolean).map((u: any) => [u.id, u]));
  const managerMap = Object.fromEntries(managers.filter(Boolean).map((m: any) => [m.id, m]));

  const privateAllowed = actor.workerId === workerId || actor.permissions.includes('people.read.private');
  const timeline: WorkerTimelineEvent[] = [];
  if (worker.hireDate) {
    timeline.push({ id: `hire-${worker.id}`, eventType: 'hire', title: 'Joined organization', effectiveDate: worker.hireDate });
  }
  for (const a of assignments) {
    const position = positionMap[a.positionId];
    const unit = unitMap[a.orgUnitId];
    timeline.push({
      id: `assignment-${a.id}`,
      eventType: 'assignment_start',
      title: position?.title || 'Assignment started',
      description: [a.primary ? 'Primary assignment' : `Secondary · ${assignmentFte(a)} FTE`, unit?.name, a.managerWorkerId ? `Manager: ${managerMap[a.managerWorkerId]?.displayName || a.managerWorkerId}` : ''].filter(Boolean).join(' · '),
      effectiveDate: a.startDate,
      status: isCurrent(a) ? 'current' : 'historical',
    });
    if (a.endDate) timeline.push({ id: `assignment-end-${a.id}`, eventType: 'assignment_end', title: `Assignment ended: ${position?.title || a.positionId}`, effectiveDate: a.endDate });
  }
  for (const c of changes) {
    timeline.push({
      id: `change-${c.id}`,
      eventType: c.changeType === 'status_change' ? 'status_change' : 'employee_change',
      title: c.changeType.replaceAll('_', ' '),
      description: privateAllowed ? c.note : undefined,
      effectiveDate: c.effectiveDate,
      status: c.status,
    });
  }
  for (const plan of secondaryPlans) {
    timeline.push({ id:`secondary-plan-${plan.id}`, eventType:'employee_change', title:`Secondary assignment ${plan.action} ${plan.status}`, description: plan.positionId ? `Position: ${positionMap[plan.positionId]?.title || plan.positionId}` : undefined, effectiveDate:plan.effectiveDate, status:plan.status });
  }
  timeline.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  const visiblePerson = !person ? null : privateAllowed ? person : {
    id: person.id,
    legalFirstName: person.legalFirstName,
    legalLastName: person.legalLastName,
    preferredName: person.preferredName,
    workEmail: person.workEmail,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
  };

  return {
    worker,
    person: visiblePerson,
    employments,
    assignments: assignments.map((a) => ({
      ...a,
      position: positionMap[a.positionId] || null,
      orgUnit: unitMap[a.orgUnitId] || null,
      manager: a.managerWorkerId ? managerMap[a.managerWorkerId] || null : null,
      current: isCurrent(a),
    })),
    changes: privateAllowed ? changes : changes.map(({ note, ...change }) => change),
    secondaryPlans,
    timeline,
  };
}

async function adjustOccupancy(tx: Transaction, actor: ActorContext, positionId: string, delta: number, timestamp: string) {
  const db = adminDb();
  const positionRef = db.doc(`organizations/${actor.orgId}/positions/${positionId}`);
  const occupancyRef = db.doc(`organizations/${actor.orgId}/positionOccupancy/${positionId}`);
  const [positionSnap, occupancySnap] = await Promise.all([tx.get(positionRef), tx.get(occupancyRef)]);
  if (!positionSnap.exists) throw new ApiError(400, 'Position does not exist.', 'invalid_position');
  const position = positionSnap.data() as Position;
  const current = Number(occupancySnap.data()?.occupiedHeadcount || 0);
  const currentFte = Number(occupancySnap.data()?.occupiedFte || current);
  const next = Math.max(0, current + delta);
  const nextFte = Math.max(0, currentFte + delta);
  if (delta > 0 && next > position.headcountLimit) {
    throw new ApiError(409, `Position capacity exceeded (${current}/${position.headcountLimit}).`, 'position_capacity_exceeded');
  }
  tx.set(occupancyRef, { positionId, occupiedHeadcount: next, occupiedFte: nextFte, updatedAt: timestamp }, { merge: true });
  if (!['planned', 'frozen', 'closed'].includes(position.status)) {
    tx.update(positionRef, { status: next >= position.headcountLimit ? 'filled' : 'open', updatedAt: timestamp });
  }
  return position;
}

async function assertManagerChain(tx: Transaction, actor: ActorContext, workerId: string, managerWorkerId?: string) {
  if (!managerWorkerId) return;
  if (managerWorkerId === workerId) throw new ApiError(409, 'An employee cannot be their own manager.', 'manager_cycle');
  const db = adminDb();
  const visited = new Set<string>([workerId]);
  let cursor: string | undefined = managerWorkerId;
  let depth = 0;
  while (cursor) {
    if (visited.has(cursor)) throw new ApiError(409, 'Manager assignment would create a reporting cycle.', 'manager_cycle');
    visited.add(cursor);
    const managerSnap = await tx.get(db.doc(`organizations/${actor.orgId}/workers/${cursor}`));
    if (!managerSnap.exists) throw new ApiError(400, 'Manager worker does not exist.', 'invalid_manager');
    const manager = managerSnap.data() as Worker;
    if (!manager.primaryAssignmentId) break;
    const assignmentSnap = await tx.get(db.doc(`organizations/${actor.orgId}/assignments/${manager.primaryAssignmentId}`));
    if (!assignmentSnap.exists) break;
    const assignment = assignmentSnap.data() as Assignment;
    if (!isCurrent(assignment)) break;
    cursor = assignment.managerWorkerId;
    depth += 1;
    if (depth > 50) throw new ApiError(409, 'Manager hierarchy exceeds the supported depth.', 'manager_hierarchy_too_deep');
  }
}

export async function createEmployee(actor: ActorContext, raw: unknown) {
  const input = employeeCreateSchema.parse(raw);
  if ((input.positionId && !input.orgUnitId) || (!input.positionId && input.orgUnitId)) {
    throw new ApiError(400, 'positionId and orgUnitId must be supplied together.', 'invalid_assignment');
  }

  const db = adminDb();
  const personId = randomUUID();
  const workerId = randomUUID();
  const employmentId = randomUUID();
  const assignmentId = input.positionId && input.orgUnitId ? randomUUID() : undefined;
  const timestamp = now();

  const person: Person = {
    id: personId,
    legalFirstName: input.legalFirstName,
    legalLastName: input.legalLastName,
    preferredName: input.preferredName,
    ...(input.workEmail ? { workEmail: input.workEmail.trim().toLowerCase() } : {}),
    personalEmail: input.personalEmail,
    phone: input.phone,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const employment: Employment = {
    id: employmentId,
    workerId,
    employmentType: input.employmentType,
    startDate: input.hireDate,
    fte: 1,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  let worker!: Worker;

  await db.runTransaction(async (tx) => {
    const normalizedEmail = input.workEmail?.trim().toLowerCase() || '';
    const emailIndexRef = normalizedEmail ? db.doc(`organizations/${actor.orgId}/workEmailIndex/${encodeURIComponent(normalizedEmail)}`) : undefined;
    const emailIndexSnap = emailIndexRef ? await tx.get(emailIndexRef) : undefined;
    if (emailIndexSnap?.exists) throw new ApiError(409, 'Work email already exists.', 'duplicate_work_email');

    let employeeNumber = String(input.employeeNumber || '').trim();
    let numberIndexRef: DocumentReference;
    let counterRef: DocumentReference | undefined;
    let nextCounterValue: number | undefined;

    if (employeeNumber) {
      const normalizedNumber = employeeNumber.toLowerCase();
      numberIndexRef = db.doc(`organizations/${actor.orgId}/employeeNumberIndex/${encodeURIComponent(normalizedNumber)}`);
      const numberIndexSnap = await tx.get(numberIndexRef);
      if (numberIndexSnap.exists) throw new ApiError(409, 'Employee number already exists.', 'duplicate_employee_number');
    } else {
      counterRef = db.doc(`organizations/${actor.orgId}/counters/employeeNumber`);
      const counterSnap = await tx.get(counterRef);
      const rawCounter = Number(counterSnap.data()?.value || 0);
      let sequence = Number.isFinite(rawCounter) && rawCounter >= 0 ? Math.floor(rawCounter) : 0;
      let allocated = false;

      for (let attempt = 0; attempt < 1000; attempt += 1) {
        sequence += 1;
        const candidate = `EMP-${String(sequence).padStart(6, '0')}`;
        const candidateRef = db.doc(`organizations/${actor.orgId}/employeeNumberIndex/${encodeURIComponent(candidate.toLowerCase())}`);
        const candidateSnap = await tx.get(candidateRef);
        if (!candidateSnap.exists) {
          employeeNumber = candidate;
          numberIndexRef = candidateRef;
          nextCounterValue = sequence;
          allocated = true;
          break;
        }
      }

      if (!allocated) throw new ApiError(503, 'Unable to allocate an employee number.', 'employee_number_exhausted');
    }

    await assertManagerChain(tx, actor, workerId, input.managerWorkerId);
    if (input.positionId) {
      const position = await adjustOccupancy(tx, actor, input.positionId, 1, timestamp);
      if (position.orgUnitId !== input.orgUnitId) throw new ApiError(409, 'Position does not belong to the selected organization unit.', 'position_org_mismatch');
    }

    worker = {
      id: workerId,
      personId,
      employeeNumber,
      displayName: input.preferredName || `${input.legalFirstName} ${input.legalLastName}`,
      displayNameLower: (input.preferredName || `${input.legalFirstName} ${input.legalLastName}`).trim().toLowerCase(),
      employeeNumberLower: employeeNumber.toLowerCase(),
      workEmail: normalizedEmail,
      ...(normalizedEmail ? { workEmailLower: normalizedEmail } : {}),
      status: 'active',
      primaryAssignmentId: assignmentId,
      hireDate: input.hireDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const audit = buildAudit(actor, {
      action: 'employee.create',
      entityType: 'worker',
      entityId: workerId,
      after: { worker, employment, assignmentId },
    });

    if (counterRef && nextCounterValue !== undefined) {
      tx.set(counterRef, { value: nextCounterValue, updatedAt: timestamp }, { merge: true });
    }

    tx.create(db.doc(`organizations/${actor.orgId}/people/${personId}`), person);
    tx.create(db.doc(`organizations/${actor.orgId}/workers/${workerId}`), worker);
    tx.create(db.doc(`organizations/${actor.orgId}/workerDirectory/${workerId}`), workerDirectoryEntry(worker));
    tx.create(db.doc(`organizations/${actor.orgId}/employments/${employmentId}`), employment);
    tx.create(numberIndexRef!, { employeeNumber, workerId, createdAt: timestamp });
    if (emailIndexRef) tx.create(emailIndexRef, { workEmail: normalizedEmail, workerId, createdAt: timestamp });

    if (assignmentId && input.positionId && input.orgUnitId) {
      const assignment: Assignment = {
        id: assignmentId,
        workerId,
        employmentId,
        positionId: input.positionId,
        orgUnitId: input.orgUnitId,
        managerWorkerId: input.managerWorkerId,
        primary: true,
        assignmentType: 'primary',
        allocationFte: 1,
        startDate: input.hireDate,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      tx.create(db.doc(`organizations/${actor.orgId}/assignments/${assignmentId}`), assignment);
    }

    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    const event = buildDomainEvent(actor, 'employee.created', 'worker', workerId, { employeeNumber: worker.employeeNumber, workEmail: worker.workEmail });
    tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event);
  });

  return { person, worker, employment, assignmentId };
}

type ParsedEmployeeChange = ReturnType<typeof employeeChangeSchema.parse>;

async function applyEmployeeChangeInternal(
  actor: ActorContext,
  workerId: string,
  input: ParsedEmployeeChange,
  options: { changeId?: string; requestedBy?: string; createdAt?: string; expectScheduled?: boolean } = {},
) {
  const db = adminDb();
  const workerRef = db.doc(`organizations/${actor.orgId}/workers/${workerId}`);
  const changeId = options.changeId || randomUUID();
  const changeRef = db.doc(`organizations/${actor.orgId}/employeeChanges/${changeId}`);
  const timestamp = now();
  const requestedBy = options.requestedBy || actor.uid;
  const createdAt = options.createdAt || timestamp;

  const assignmentRefs = input.changeType === 'status_change' && input.workerStatus === 'terminated'
    ? (await db.collection(`organizations/${actor.orgId}/assignments`).where('workerId', '==', workerId).get()).docs.map((d) => d.ref)
    : [];
  const employmentRefs = input.changeType === 'status_change' && input.workerStatus === 'terminated'
    ? (await db.collection(`organizations/${actor.orgId}/employments`).where('workerId', '==', workerId).get()).docs.map((d) => d.ref)
    : [];

  let result!: EmployeeChange;
  await db.runTransaction(async (tx) => {
    const [currentWorkerSnap, existingChangeSnap] = await Promise.all([tx.get(workerRef), tx.get(changeRef)]);
    if (!currentWorkerSnap.exists) throw new ApiError(404, 'Employee not found.', 'employee_not_found');
    if (options.expectScheduled && (!existingChangeSnap.exists || existingChangeSnap.data()?.status !== 'scheduled')) {
      throw new ApiError(409, 'Scheduled change has already been processed or cancelled.', 'change_not_scheduled');
    }
    if (!options.expectScheduled && existingChangeSnap.exists) throw new ApiError(409, 'Employee change already exists.', 'change_exists');
    const currentWorker = currentWorkerSnap.data() as Worker;

    if (input.changeType === 'status_change') {
      const nextStatus = input.workerStatus as WorkerStatus;
      const before = { status: currentWorker.status, terminationDate: currentWorker.terminationDate || null, primaryAssignmentId: currentWorker.primaryAssignmentId || null };
      const workerUpdate: Record<string, unknown> = { status: nextStatus, updatedAt: timestamp };
      if (nextStatus === 'terminated') workerUpdate.terminationDate = input.effectiveDate;
      else if (currentWorker.terminationDate) workerUpdate.terminationDate = FieldValue.delete();

      if (nextStatus === 'terminated') {
        const assignmentSnaps: any[] = [];
        for (const ref of assignmentRefs) assignmentSnaps.push(await tx.get(ref));
        const activeAssignments = assignmentSnaps
          .filter((snap) => snap.exists)
          .map((snap) => snap.data() as Assignment)
          .filter((assignment) => isCurrent(assignment, input.effectiveDate));
        const positionIds = [...new Set(activeAssignments.map((assignment) => assignment.positionId))];
        const positionData = new Map<string, { position: Position; occupiedHeadcount: number; occupiedFte: number }>();
        for (const positionId of positionIds) {
          const positionRef = db.doc(`organizations/${actor.orgId}/positions/${positionId}`);
          const occupancyRef = db.doc(`organizations/${actor.orgId}/positionOccupancy/${positionId}`);
          const [positionSnap, occupancySnap] = await Promise.all([tx.get(positionRef), tx.get(occupancyRef)]);
          if (positionSnap.exists) {
            const position = positionSnap.data() as Position;
            positionData.set(positionId, {
              position,
              occupiedHeadcount: Number(occupancySnap.data()?.occupiedHeadcount || 0),
              occupiedFte: Number(occupancySnap.data()?.occupiedFte || occupancySnap.data()?.occupiedHeadcount || 0),
            });
          }
        }
        const employmentSnaps: any[] = [];
        for (const ref of employmentRefs) employmentSnaps.push(await tx.get(ref));

        workerUpdate.primaryAssignmentId = FieldValue.delete();
        tx.update(workerRef, workerUpdate);
        tx.set(db.doc(`organizations/${actor.orgId}/workerDirectory/${workerId}`), { id: workerId, displayName: currentWorker.displayName, ...(currentWorker.workEmail ? { workEmail: currentWorker.workEmail } : {}), status: nextStatus, updatedAt: timestamp }, { merge: true });
        for (const snap of assignmentSnaps) {
          if (!snap.exists) continue;
          const assignment = snap.data() as Assignment;
          if (!isCurrent(assignment, input.effectiveDate)) continue;
          tx.update(snap.ref, { endDate: input.effectiveDate, updatedAt: timestamp });
          if (!assignment.primary) {
            tx.delete(db.doc(`organizations/${actor.orgId}/secondaryAssignmentIndex/${encodeURIComponent(`${workerId}__${assignment.positionId}`)}`));
          }
        }
        for (const [positionId, data] of positionData) {
          const ended = activeAssignments.filter((assignment) => assignment.positionId === positionId);
          const nextHeadcount = Math.max(0, data.occupiedHeadcount - ended.length);
          const nextFte = Math.max(0, data.occupiedFte - ended.reduce((sum, assignment) => sum + assignmentFte(assignment), 0));
          tx.set(db.doc(`organizations/${actor.orgId}/positionOccupancy/${positionId}`), { positionId, occupiedHeadcount: nextHeadcount, occupiedFte: nextFte, updatedAt: timestamp }, { merge: true });
          if (!['planned', 'frozen', 'closed'].includes(data.position.status)) {
            tx.update(db.doc(`organizations/${actor.orgId}/positions/${positionId}`), { status: nextHeadcount >= data.position.headcountLimit ? 'filled' : 'open', updatedAt: timestamp });
          }
        }
        for (const snap of employmentSnaps) {
          if (!snap.exists) continue;
          const employment = snap.data() as Employment;
          if (employment.status === 'active' && employment.startDate <= input.effectiveDate && (!employment.endDate || employment.endDate >= input.effectiveDate)) {
            tx.update(snap.ref, { status: 'ended', endDate: input.effectiveDate, updatedAt: timestamp });
          }
        }
      } else {
        tx.update(workerRef, workerUpdate);
        tx.set(db.doc(`organizations/${actor.orgId}/workerDirectory/${workerId}`), { id: workerId, displayName: currentWorker.displayName, ...(currentWorker.workEmail ? { workEmail: currentWorker.workEmail } : {}), status: nextStatus, updatedAt: timestamp }, { merge: true });
      }

      result = {
        id: changeId,
        workerId,
        changeType: input.changeType,
        effectiveDate: input.effectiveDate,
        status: 'applied',
        workerStatus: nextStatus,
        note: input.note,
        requestedBy,
        createdAt,
        appliedAt: timestamp,
        appliedBy: actor.uid,
        executionAttempts: options.expectScheduled ? Number(existingChangeSnap.data()?.executionAttempts || 0) + 1 : undefined,
        lastExecutionAt: options.expectScheduled ? timestamp : undefined,
      };
      if (options.expectScheduled) tx.set(changeRef, { ...result, lastExecutionError: FieldValue.delete() }, { merge: true }); else tx.create(changeRef, result);
      const audit = buildAudit(actor, { action: 'employee.status.change', entityType: 'worker', entityId: workerId, before, after: workerUpdate, metadata: { changeId, effectiveDate: input.effectiveDate, requestedBy } });
      tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
      const event = buildDomainEvent(actor, 'employee.updated', 'worker', workerId, { changeId, changeType: input.changeType, effectiveDate: input.effectiveDate });
      tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event);
      return;
    }

    const assignmentRef = currentWorker.primaryAssignmentId
      ? db.doc(`organizations/${actor.orgId}/assignments/${currentWorker.primaryAssignmentId}`)
      : null;
    const assignmentSnap = assignmentRef ? await tx.get(assignmentRef) : null;
    const currentAssignment = assignmentSnap?.exists ? assignmentSnap.data() as Assignment : null;
    if (!currentAssignment || !assignmentRef) throw new ApiError(409, 'Employee has no primary assignment to change.', 'assignment_required');
    if (input.effectiveDate < currentAssignment.startDate) throw new ApiError(409, 'Effective date precedes current assignment.', 'invalid_effective_date');

    const targetPositionId = input.changeType === 'manager_change' ? currentAssignment.positionId : input.positionId!;
    const targetOrgUnitId = input.changeType === 'manager_change' ? currentAssignment.orgUnitId : input.orgUnitId!;
    const targetManagerWorkerId = input.managerWorkerId ?? currentAssignment.managerWorkerId;
    const newAssignmentId = randomUUID();
    await assertManagerChain(tx, actor, workerId, targetManagerWorkerId);

    const targetPositionRef = db.doc(`organizations/${actor.orgId}/positions/${targetPositionId}`);
    const targetPositionSnap = await tx.get(targetPositionRef);
    if (!targetPositionSnap.exists) throw new ApiError(400, 'Target position does not exist.', 'invalid_position');
    const targetPosition = targetPositionSnap.data() as Position;
    if (targetPosition.orgUnitId !== targetOrgUnitId) throw new ApiError(409, 'Position does not belong to the selected organization unit.', 'position_org_mismatch');

    if (targetPositionId !== currentAssignment.positionId) {
      const currentPositionRef = db.doc(`organizations/${actor.orgId}/positions/${currentAssignment.positionId}`);
      const currentOccupancyRef = db.doc(`organizations/${actor.orgId}/positionOccupancy/${currentAssignment.positionId}`);
      const targetOccupancyRef = db.doc(`organizations/${actor.orgId}/positionOccupancy/${targetPositionId}`);
      const [currentPositionSnap, currentOccupancySnap, targetOccupancySnap] = await Promise.all([
        tx.get(currentPositionRef), tx.get(currentOccupancyRef), tx.get(targetOccupancyRef),
      ]);
      if (!currentPositionSnap.exists) throw new ApiError(400, 'Current position does not exist.', 'invalid_position');
      const currentPosition = currentPositionSnap.data() as Position;
      const currentCount = Number(currentOccupancySnap.data()?.occupiedHeadcount || 0);
      const currentFte = Number(currentOccupancySnap.data()?.occupiedFte || currentCount);
      const targetCount = Number(targetOccupancySnap.data()?.occupiedHeadcount || 0);
      const targetFte = Number(targetOccupancySnap.data()?.occupiedFte || targetCount);
      if (targetCount + 1 > targetPosition.headcountLimit) throw new ApiError(409, `Position capacity exceeded (${targetCount}/${targetPosition.headcountLimit}).`, 'position_capacity_exceeded');
      const allocation = assignmentFte(currentAssignment);
      tx.set(currentOccupancyRef, { positionId: currentPosition.id, occupiedHeadcount: Math.max(0, currentCount - 1), occupiedFte: Math.max(0, currentFte - allocation), updatedAt: timestamp }, { merge: true });
      tx.set(targetOccupancyRef, { positionId: targetPosition.id, occupiedHeadcount: targetCount + 1, occupiedFte: targetFte + allocation, updatedAt: timestamp }, { merge: true });
      if (!['planned', 'frozen', 'closed'].includes(currentPosition.status)) tx.update(currentPositionRef, { status: currentCount - 1 >= currentPosition.headcountLimit ? 'filled' : 'open', updatedAt: timestamp });
      if (!['planned', 'frozen', 'closed'].includes(targetPosition.status)) tx.update(targetPositionRef, { status: targetCount + 1 >= targetPosition.headcountLimit ? 'filled' : 'open', updatedAt: timestamp });
    }

    tx.update(assignmentRef, { endDate: previousDate(input.effectiveDate), updatedAt: timestamp });
    const newAssignment: Assignment = {
      id: newAssignmentId,
      workerId,
      employmentId: currentAssignment.employmentId,
      positionId: targetPositionId,
      orgUnitId: targetOrgUnitId,
      managerWorkerId: targetManagerWorkerId,
      primary: true,
      assignmentType: 'primary',
      allocationFte: assignmentFte(currentAssignment),
      startDate: input.effectiveDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    tx.create(db.doc(`organizations/${actor.orgId}/assignments/${newAssignmentId}`), newAssignment);
    tx.update(workerRef, { primaryAssignmentId: newAssignmentId, updatedAt: timestamp });

    result = {
      id: changeId,
      workerId,
      changeType: input.changeType,
      effectiveDate: input.effectiveDate,
      status: 'applied',
      fromAssignmentId: currentAssignment.id,
      toAssignmentId: newAssignmentId,
      positionId: targetPositionId,
      orgUnitId: targetOrgUnitId,
      managerWorkerId: targetManagerWorkerId,
      note: input.note,
      requestedBy,
      createdAt,
      appliedAt: timestamp,
      appliedBy: actor.uid,
      executionAttempts: options.expectScheduled ? Number(existingChangeSnap.data()?.executionAttempts || 0) + 1 : undefined,
      lastExecutionAt: options.expectScheduled ? timestamp : undefined,
    };
    if (options.expectScheduled) tx.set(changeRef, { ...result, lastExecutionError: FieldValue.delete() }, { merge: true }); else tx.create(changeRef, result);
    const audit = buildAudit(actor, {
      action: `employee.${input.changeType}`,
      entityType: 'worker',
      entityId: workerId,
      before: currentAssignment,
      after: newAssignment,
      metadata: { changeId, effectiveDate: input.effectiveDate, note: input.note || null, requestedBy },
    });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    const event = buildDomainEvent(actor, 'employee.updated', 'worker', workerId, { changeId, changeType: input.changeType, effectiveDate: input.effectiveDate });
    tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event);
  });

  return result;
}

export async function createEmployeeChange(actor: ActorContext, workerId: string, raw: unknown) {
  const input = employeeChangeSchema.parse(raw);
  const db = adminDb();
  const workerSnap = await db.doc(`organizations/${actor.orgId}/workers/${workerId}`).get();
  if (!workerSnap.exists) throw new ApiError(404, 'Employee not found.', 'employee_not_found');
  const changeId = randomUUID();
  const timestamp = now();

  if (input.effectiveDate > today()) {
    const change: EmployeeChange = {
      id: changeId,
      workerId,
      changeType: input.changeType,
      effectiveDate: input.effectiveDate,
      status: 'scheduled',
      positionId: input.positionId,
      orgUnitId: input.orgUnitId,
      managerWorkerId: input.managerWorkerId,
      workerStatus: input.workerStatus,
      note: input.note,
      requestedBy: actor.uid,
      createdAt: timestamp,
      executionAttempts: 0,
    };
    const audit = buildAudit(actor, { action: 'employee.change.schedule', entityType: 'employeeChange', entityId: changeId, after: change });
    const batch = db.batch();
    batch.create(db.doc(`organizations/${actor.orgId}/employeeChanges/${changeId}`), change);
    batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    await batch.commit();
    return change;
  }

  return applyEmployeeChangeInternal(actor, workerId, input, { changeId, requestedBy: actor.uid, createdAt: timestamp });
}

export async function processDueEmployeeChanges(orgId: string, limit = 100) {
  const db = adminDb();
  const safeLimit = Math.max(1, Math.min(limit, 250));
  const snap = await db.collection(`organizations/${orgId}/employeeChanges`)
    .where('status', '==', 'scheduled')
    .where('effectiveDate', '<=', today())
    .orderBy('effectiveDate', 'asc')
    .limit(safeLimit)
    .get();
  const summary = { scanned: snap.size, applied: 0, failed: 0, skipped: 0 };
  const actor = systemActor(orgId, 'system:scheduled-change-executor');
  const notificationSettings = await getNotificationSettingsForOrg(orgId);

  for (const doc of snap.docs) {
    const change = doc.data() as EmployeeChange;
    try {
      const input = employeeChangeSchema.parse({
        changeType: change.changeType,
        effectiveDate: change.effectiveDate,
        positionId: change.positionId,
        orgUnitId: change.orgUnitId,
        managerWorkerId: change.managerWorkerId,
        workerStatus: change.workerStatus,
        note: change.note,
      });
      await applyEmployeeChangeInternal(actor, change.workerId, input, {
        changeId: change.id,
        requestedBy: change.requestedBy,
        createdAt: change.createdAt,
        expectScheduled: true,
      });
      summary.applied += 1;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'change_not_scheduled') {
        summary.skipped += 1;
        continue;
      }
      const message = error instanceof Error ? error.message : 'Unknown scheduled-change execution error';
      const timestamp = now();
      const attempts = Number(change.executionAttempts || 0) + 1;
      const finalFailure = attempts >= 5;
      const batch = db.batch();
      batch.set(doc.ref, {
        executionAttempts: attempts,
        lastExecutionAt: timestamp,
        lastExecutionError: message.slice(0, 1000),
        ...(finalFailure ? { status: 'failed' } : {}),
      }, { merge: true });
      const audit = buildAudit(actor, {
        action: finalFailure ? 'employee.change.execution_failed' : 'employee.change.execution_retry',
        entityType: 'employeeChange',
        entityId: change.id,
        before: change,
        after: { status: finalFailure ? 'failed' : 'scheduled', executionAttempts: attempts, lastExecutionError: message.slice(0, 1000) },
        metadata: { workerId: change.workerId, effectiveDate: change.effectiveDate, attempt: attempts },
      });
      batch.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`), audit);
      if (finalFailure && notificationSettings.failureAlertsEnabled && (notificationSettings.inAppEnabled || notificationSettings.emailEnabled)) {
        const notificationId = randomUUID();
        batch.create(db.doc(`organizations/${orgId}/notifications/${notificationId}`), {
          id: notificationId,
          type: 'employee.change.execution_failed',
          title: 'Scheduled employee change requires review',
          message: `Change ${change.id} for worker ${change.workerId} failed after ${attempts} attempts.`,
          targetRole: 'hr_admin',
          entityType: 'employeeChange',
          entityId: change.id,
          status: 'unread',
          inAppVisible: notificationSettings.inAppEnabled,
          emailStatus: notificationSettings.emailEnabled ? 'pending' : 'disabled',
          emailAttempts: 0,
          createdAt: timestamp,
        });
      }
      await batch.commit();
      summary.failed += 1;
    }
  }
  return summary;
}


async function scheduleSecondaryAssignmentStart(actor: ActorContext, workerId: string, input: ReturnType<typeof secondaryAssignmentCreateSchema.parse>) {
  const db=adminDb(); const timestamp=now(); const id=randomUUID();
  const workerSnap=await db.doc(`organizations/${actor.orgId}/workers/${workerId}`).get();
  if(!workerSnap.exists) throw new ApiError(404,'Employee not found.','employee_not_found');
  const positionSnap=await db.doc(`organizations/${actor.orgId}/positions/${input.positionId}`).get();
  if(!positionSnap.exists) throw new ApiError(400,'Position does not exist.','invalid_position');
  const position=positionSnap.data() as Position;
  if(position.orgUnitId!==input.orgUnitId) throw new ApiError(409,'Position does not belong to the selected organization unit.','position_org_mismatch');
  const plan:SecondaryAssignmentPlan={id,workerId,action:'start',effectiveDate:input.startDate,status:'scheduled',employmentId:input.employmentId,positionId:input.positionId,orgUnitId:input.orgUnitId,managerWorkerId:input.managerWorkerId,allocationFte:input.allocationFte,requestedBy:actor.uid,createdAt:timestamp,executionAttempts:0};
  const audit=buildAudit(actor,{action:'assignment.secondary.schedule_start',entityType:'secondaryAssignmentPlan',entityId:id,after:plan});
  const planIndexRef=db.doc(`organizations/${actor.orgId}/secondaryAssignmentPlanIndex/${encodeURIComponent(`start__${workerId}__${input.positionId}`)}`);
  await db.runTransaction(async tx=>{const currentIndexRef=db.doc(`organizations/${actor.orgId}/secondaryAssignmentIndex/${encodeURIComponent(`${workerId}__${input.positionId}`)}`);const [existing,current]=await Promise.all([tx.get(planIndexRef),tx.get(currentIndexRef)]);if(existing.exists) throw new ApiError(409,'A future secondary assignment start is already scheduled for this worker and position.','secondary_plan_exists');if(current.exists) throw new ApiError(409,'Worker already has a current secondary assignment in this position.','duplicate_secondary_assignment');tx.create(db.doc(`organizations/${actor.orgId}/secondaryAssignmentPlans/${id}`),plan);tx.create(planIndexRef,{planId:id,workerId,positionId:input.positionId,action:'start',effectiveDate:input.startDate,status:'scheduled',createdAt:timestamp});tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);});
  return plan;
}

async function scheduleSecondaryAssignmentEnd(actor: ActorContext, workerId: string, assignmentId: string, input: ReturnType<typeof secondaryAssignmentEndSchema.parse>) {
  const db=adminDb(); const timestamp=now(); const id=randomUUID(); const assignmentSnap=await db.doc(`organizations/${actor.orgId}/assignments/${assignmentId}`).get();
  if(!assignmentSnap.exists) throw new ApiError(404,'Assignment not found.','assignment_not_found');
  const assignment=assignmentSnap.data() as Assignment;
  if(assignment.workerId!==workerId) throw new ApiError(403,'Assignment does not belong to this worker.','assignment_worker_mismatch');
  if(assignment.primary||assignment.assignmentType==='primary') throw new ApiError(409,'Primary assignments must be changed through effective-dated employee changes.','primary_assignment_protected');
  if(input.endDate<=assignment.startDate) throw new ApiError(409,'Effective end date must be after assignment start date.','invalid_end_date');
  const plan:SecondaryAssignmentPlan={id,workerId,action:'end',effectiveDate:input.endDate,status:'scheduled',assignmentId,positionId:assignment.positionId,orgUnitId:assignment.orgUnitId,requestedBy:actor.uid,createdAt:timestamp,executionAttempts:0};
  const audit=buildAudit(actor,{action:'assignment.secondary.schedule_end',entityType:'secondaryAssignmentPlan',entityId:id,after:plan,metadata:{note:input.note||null}});
  const planIndexRef=db.doc(`organizations/${actor.orgId}/secondaryAssignmentPlanIndex/${encodeURIComponent(`end__${assignmentId}`)}`);
  await db.runTransaction(async tx=>{const existing=await tx.get(planIndexRef);if(existing.exists) throw new ApiError(409,'A future change is already scheduled for this secondary assignment.','secondary_plan_exists');tx.create(db.doc(`organizations/${actor.orgId}/secondaryAssignmentPlans/${id}`),plan);tx.create(planIndexRef,{planId:id,workerId,assignmentId,action:'end',effectiveDate:input.endDate,status:'scheduled',createdAt:timestamp});tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);});
  return plan;
}

export async function createSecondaryAssignment(actor: ActorContext, workerId: string, raw: unknown) {
  const input = secondaryAssignmentCreateSchema.parse(raw);
  if (input.startDate > today()) return scheduleSecondaryAssignmentStart(actor, workerId, input);
  const db = adminDb();
  const timestamp = now();
  const workerRef = db.doc(`organizations/${actor.orgId}/workers/${workerId}`);
  const workerSnap = await workerRef.get();
  if (!workerSnap.exists) throw new ApiError(404, 'Employee not found.', 'employee_not_found');
  const worker = workerSnap.data() as Worker;
  if (worker.status === 'terminated') throw new ApiError(409, 'Cannot assign a terminated worker.', 'worker_terminated');
  if (!worker.primaryAssignmentId && !input.employmentId) throw new ApiError(409, 'An employmentId is required when the worker has no primary assignment.', 'employment_required');

  const currentAssignmentsSnap = await db.collection(`organizations/${actor.orgId}/assignments`).where('workerId', '==', workerId).get();
  if (currentAssignmentsSnap.docs.map((d) => d.data() as Assignment).some((a) => isCurrent(a) && a.positionId === input.positionId)) {
    throw new ApiError(409, 'Worker already has a current assignment in this position.', 'duplicate_position_assignment');
  }

  const id = randomUUID();
  const indexRef = db.doc(`organizations/${actor.orgId}/secondaryAssignmentIndex/${encodeURIComponent(`${workerId}__${input.positionId}`)}`);
  let assignment!: Assignment;
  await db.runTransaction(async (tx) => {
    const [currentWorkerSnap, indexSnap] = await Promise.all([tx.get(workerRef), tx.get(indexRef)]);
    if (!currentWorkerSnap.exists) throw new ApiError(404, 'Employee not found.', 'employee_not_found');
    if (indexSnap.exists) throw new ApiError(409, 'A current secondary assignment already exists for this worker and position.', 'duplicate_secondary_assignment');
    const currentWorker = currentWorkerSnap.data() as Worker;
    const primaryRef = currentWorker.primaryAssignmentId ? db.doc(`organizations/${actor.orgId}/assignments/${currentWorker.primaryAssignmentId}`) : null;
    const primarySnap = primaryRef ? await tx.get(primaryRef) : null;
    const employmentId = input.employmentId || (primarySnap?.exists ? (primarySnap.data() as Assignment).employmentId : undefined);
    if (!employmentId) throw new ApiError(409, 'Unable to resolve employment for secondary assignment.', 'employment_required');
    const employmentSnap = await tx.get(db.doc(`organizations/${actor.orgId}/employments/${employmentId}`));
    if (!employmentSnap.exists || (employmentSnap.data() as Employment).workerId !== workerId) throw new ApiError(409, 'Employment does not belong to the worker.', 'invalid_employment');
    const positionRef = db.doc(`organizations/${actor.orgId}/positions/${input.positionId}`);
    const occupancyRef = db.doc(`organizations/${actor.orgId}/positionOccupancy/${input.positionId}`);
    const [positionSnap, occupancySnap] = await Promise.all([tx.get(positionRef), tx.get(occupancyRef)]);
    if (!positionSnap.exists) throw new ApiError(400, 'Position does not exist.', 'invalid_position');
    const position = positionSnap.data() as Position;
    if (position.orgUnitId !== input.orgUnitId) throw new ApiError(409, 'Position does not belong to the selected organization unit.', 'position_org_mismatch');
    await assertManagerChain(tx, actor, workerId, input.managerWorkerId);
    const currentHeadcount = Number(occupancySnap.data()?.occupiedHeadcount || 0);
    const currentFte = Number(occupancySnap.data()?.occupiedFte || currentHeadcount);
    if (currentHeadcount + 1 > position.headcountLimit) throw new ApiError(409, `Position capacity exceeded (${currentHeadcount}/${position.headcountLimit}).`, 'position_capacity_exceeded');

    assignment = {
      id,
      workerId,
      employmentId,
      positionId: input.positionId,
      orgUnitId: input.orgUnitId,
      managerWorkerId: input.managerWorkerId,
      primary: false,
      assignmentType: 'secondary',
      allocationFte: input.allocationFte,
      startDate: input.startDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    tx.create(db.doc(`organizations/${actor.orgId}/assignments/${id}`), assignment);
    tx.create(indexRef, { assignmentId: id, workerId, positionId: input.positionId, createdAt: timestamp });
    tx.set(occupancyRef, { positionId: input.positionId, occupiedHeadcount: currentHeadcount + 1, occupiedFte: currentFte + input.allocationFte, updatedAt: timestamp }, { merge: true });
    if (!['planned', 'frozen', 'closed'].includes(position.status)) tx.update(positionRef, { status: currentHeadcount + 1 >= position.headcountLimit ? 'filled' : 'open', updatedAt: timestamp });
    const audit = buildAudit(actor, { action: 'assignment.secondary.create', entityType: 'assignment', entityId: id, after: assignment });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    const event = buildDomainEvent(actor, 'employee.updated', 'worker', workerId, { assignmentId: id, assignmentType: 'secondary', action: 'created' });
    tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event);
  });
  return assignment;
}

export async function endSecondaryAssignment(actor: ActorContext, workerId: string, assignmentId: string, raw: unknown) {
  const input = secondaryAssignmentEndSchema.parse(raw);
  if (input.endDate > today()) return scheduleSecondaryAssignmentEnd(actor, workerId, assignmentId, input);
  const db = adminDb();
  const timestamp = now();
  const assignmentRef = db.doc(`organizations/${actor.orgId}/assignments/${assignmentId}`);
  let result!: Assignment;
  await db.runTransaction(async (tx) => {
    const assignmentSnap = await tx.get(assignmentRef);
    if (!assignmentSnap.exists) throw new ApiError(404, 'Assignment not found.', 'assignment_not_found');
    const assignment = assignmentSnap.data() as Assignment;
    if (assignment.workerId !== workerId) throw new ApiError(403, 'Assignment does not belong to this worker.', 'assignment_worker_mismatch');
    if (assignment.primary || assignment.assignmentType === 'primary') throw new ApiError(409, 'Primary assignments must be changed through effective-dated employee changes.', 'primary_assignment_protected');
    if (assignment.endDate && assignment.endDate <= today()) throw new ApiError(409, 'Secondary assignment has already ended.', 'assignment_ended');
    if (input.endDate <= assignment.startDate) throw new ApiError(409, 'Effective end date must be after assignment start date.', 'invalid_end_date');
    const positionRef = db.doc(`organizations/${actor.orgId}/positions/${assignment.positionId}`);
    const occupancyRef = db.doc(`organizations/${actor.orgId}/positionOccupancy/${assignment.positionId}`);
    const [positionSnap, occupancySnap] = await Promise.all([tx.get(positionRef), tx.get(occupancyRef)]);
    const position = positionSnap.exists ? positionSnap.data() as Position : null;
    const currentHeadcount = Number(occupancySnap.data()?.occupiedHeadcount || 0);
    const currentFte = Number(occupancySnap.data()?.occupiedFte || currentHeadcount);
    const storedEndDate = previousDate(input.endDate);
    result = { ...assignment, endDate: storedEndDate, updatedAt: timestamp };
    tx.update(assignmentRef, { endDate: storedEndDate, updatedAt: timestamp });
    tx.delete(db.doc(`organizations/${actor.orgId}/secondaryAssignmentIndex/${encodeURIComponent(`${workerId}__${assignment.positionId}`)}`));
    tx.set(occupancyRef, { positionId: assignment.positionId, occupiedHeadcount: Math.max(0, currentHeadcount - 1), occupiedFte: Math.max(0, currentFte - assignmentFte(assignment)), updatedAt: timestamp }, { merge: true });
    if (position && !['planned', 'frozen', 'closed'].includes(position.status)) tx.update(positionRef, { status: currentHeadcount - 1 >= position.headcountLimit ? 'filled' : 'open', updatedAt: timestamp });
    const audit = buildAudit(actor, { action: 'assignment.secondary.end', entityType: 'assignment', entityId: assignmentId, before: assignment, after: result, metadata: { note: input.note || null, effectiveEndDate: input.endDate } });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    const event = buildDomainEvent(actor, 'employee.updated', 'worker', workerId, { assignmentId, assignmentType: 'secondary', action: 'ended', effectiveDate: input.endDate });
    tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event);
  });
  return result;
}



export async function actOnSecondaryAssignmentPlan(actor: ActorContext, workerId: string, planId: string, raw: unknown) {
  const input = secondaryAssignmentPlanActionSchema.parse(raw);
  const db = adminDb();
  const planRef = db.doc(`organizations/${actor.orgId}/secondaryAssignmentPlans/${planId}`);
  const timestamp = now();
  let next!: SecondaryAssignmentPlan;
  await db.runTransaction(async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists) throw new ApiError(404, 'Secondary assignment plan not found.', 'secondary_plan_not_found');
    const plan = planSnap.data() as SecondaryAssignmentPlan;
    if (plan.workerId !== workerId) throw new ApiError(403, 'Plan does not belong to this worker.', 'secondary_plan_worker_mismatch');
    if (plan.status === 'applied') throw new ApiError(409, 'Applied plans cannot be changed.', 'secondary_plan_applied');
    const indexId = plan.action === 'start'
      ? encodeURIComponent(`start__${plan.workerId}__${plan.positionId}`)
      : encodeURIComponent(`end__${plan.assignmentId}`);
    const indexRef = db.doc(`organizations/${actor.orgId}/secondaryAssignmentPlanIndex/${indexId}`);
    if (input.action === 'cancel') {
      if (plan.status === 'cancelled') { next = plan; return; }
      next = { ...plan, status: 'cancelled', lastExecutionError: undefined };
      tx.set(planRef, { status: 'cancelled', cancelledAt: timestamp, cancelledBy: actor.uid, lastExecutionError: FieldValue.delete(), updatedAt: timestamp }, { merge: true });
      tx.delete(indexRef);
      const audit = buildAudit(actor, { action: 'assignment.secondary.plan_cancel', entityType: 'secondaryAssignmentPlan', entityId: planId, before: plan, after: next, metadata: { workerId } });
      tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
      return;
    }
    if (plan.status !== 'failed') throw new ApiError(409, 'Only failed plans can be retried.', 'secondary_plan_retry_not_allowed');
    const existing = await tx.get(indexRef);
    if (existing.exists && existing.data()?.planId !== planId) throw new ApiError(409, 'Another secondary assignment plan already reserves this action.', 'secondary_plan_conflict');
    next = { ...plan, status: 'scheduled', executionAttempts: 0, lastExecutionError: undefined };
    tx.set(planRef, { status: 'scheduled', executionAttempts: 0, lastExecutionError: FieldValue.delete(), retryRequestedAt: timestamp, retryRequestedBy: actor.uid, updatedAt: timestamp }, { merge: true });
    tx.set(indexRef, { planId, workerId: plan.workerId, assignmentId: plan.assignmentId || null, positionId: plan.positionId || null, action: plan.action, effectiveDate: plan.effectiveDate, status: 'scheduled', updatedAt: timestamp }, { merge: true });
    const audit = buildAudit(actor, { action: 'assignment.secondary.plan_retry', entityType: 'secondaryAssignmentPlan', entityId: planId, before: plan, after: next, metadata: { workerId } });
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  });
  return next;
}

export async function processDueSecondaryAssignmentPlans(orgId:string, limit=100) {
  const db=adminDb(); const actor=systemActor(orgId,'system:secondary-assignment-executor'); const safe=Math.max(1,Math.min(limit,250));
  const notificationSettings=await getNotificationSettingsForOrg(orgId);
  const snap=await db.collection(`organizations/${orgId}/secondaryAssignmentPlans`).where('status','==','scheduled').where('effectiveDate','<=',today()).orderBy('effectiveDate','asc').limit(safe).get();
  const summary={scanned:snap.size,applied:0,failed:0,skipped:0};
  for(const doc of snap.docs){ const plan=doc.data() as SecondaryAssignmentPlan;
    try{
      let assignmentId=plan.assignmentId;
      if(plan.action==='start'){
        const index=await db.doc(`organizations/${orgId}/secondaryAssignmentIndex/${encodeURIComponent(`${plan.workerId}__${plan.positionId}`)}`).get();
        if(index.exists) assignmentId=index.data()?.assignmentId as string|undefined;
        else {
          const created=await createSecondaryAssignment(actor,plan.workerId,{employmentId:plan.employmentId,positionId:plan.positionId,orgUnitId:plan.orgUnitId,managerWorkerId:plan.managerWorkerId,allocationFte:plan.allocationFte||0.25,startDate:plan.effectiveDate}) as Assignment;
          assignmentId=created.id;
        }
      } else {
        if(!plan.assignmentId) throw new ApiError(409,'Scheduled secondary-assignment end is missing assignmentId.','invalid_secondary_plan');
        const aSnap=await db.doc(`organizations/${orgId}/assignments/${plan.assignmentId}`).get();
        if(!aSnap.exists) throw new ApiError(404,'Assignment not found.','assignment_not_found');
        const a=aSnap.data() as Assignment;
        if(!(a.endDate&&a.endDate<today())) await endSecondaryAssignment(actor,plan.workerId,plan.assignmentId,{endDate:plan.effectiveDate});
      }
      const timestamp=now(); const audit=buildAudit(actor,{action:`assignment.secondary.plan_${plan.action}.applied`,entityType:'secondaryAssignmentPlan',entityId:plan.id,before:plan,after:{status:'applied',assignmentId},metadata:{effectiveDate:plan.effectiveDate}});
      const batch=db.batch(); batch.set(doc.ref,{status:'applied',assignmentId:assignmentId||plan.assignmentId||null,appliedAt:timestamp,appliedBy:actor.uid,lastExecutionAt:timestamp,executionAttempts:Number(plan.executionAttempts||0)+1,lastExecutionError:FieldValue.delete()},{merge:true});
      const planIndexId=plan.action==='start'?encodeURIComponent(`start__${plan.workerId}__${plan.positionId}`):encodeURIComponent(`end__${plan.assignmentId}`); batch.delete(db.doc(`organizations/${orgId}/secondaryAssignmentPlanIndex/${planIndexId}`));
      batch.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`),audit); await batch.commit(); summary.applied++;
    }catch(error){
      const message=error instanceof Error?error.message:'Unknown secondary-assignment execution error'; const attempts=Number(plan.executionAttempts||0)+1; const finalFailure=attempts>=5; const timestamp=now(); const batch=db.batch();
      batch.set(doc.ref,{executionAttempts:attempts,lastExecutionAt:timestamp,lastExecutionError:message.slice(0,1000),...(finalFailure?{status:'failed'}:{})},{merge:true});
      const audit=buildAudit(actor,{action:finalFailure?'assignment.secondary.execution_failed':'assignment.secondary.execution_retry',entityType:'secondaryAssignmentPlan',entityId:plan.id,before:plan,after:{status:finalFailure?'failed':'scheduled',executionAttempts:attempts,lastExecutionError:message.slice(0,1000)}}); batch.create(db.doc(`organizations/${orgId}/auditLogs/${audit.id}`),audit);
      if(finalFailure&&notificationSettings.failureAlertsEnabled&&(notificationSettings.inAppEnabled||notificationSettings.emailEnabled)){const notificationId=randomUUID();batch.create(db.doc(`organizations/${orgId}/notifications/${notificationId}`),{id:notificationId,type:'assignment.secondary.execution_failed',title:'Scheduled secondary assignment requires review',message:`Plan ${plan.id} for worker ${plan.workerId} failed after ${attempts} attempts.`,targetRole:'hr_admin',entityType:'secondaryAssignmentPlan',entityId:plan.id,status:'unread',inAppVisible:notificationSettings.inAppEnabled,emailStatus:notificationSettings.emailEnabled?'pending':'disabled',emailAttempts:0,createdAt:timestamp});}
      await batch.commit(); summary.failed++;
    }
  }
  return summary;
}

export async function listPositions(actor: ActorContext): Promise<PositionWithOccupancy[]> {
  const db = adminDb();
  const [positionSnap, assignmentSnap, workerSnap] = await Promise.all([
    db.collection(`organizations/${actor.orgId}/positions`).orderBy('title').limit(500).get(),
    db.collection(`organizations/${actor.orgId}/assignments`).limit(5000).get(),
    db.collection(`organizations/${actor.orgId}/workers`).limit(5000).get(),
  ]);
  const workerStatus = new Map(workerSnap.docs.map((doc) => { const worker = doc.data() as Worker; return [worker.id, worker.status] as const; }));
  const occupancy = new Map<string, { headcount: number; fte: number }>();
  for (const doc of assignmentSnap.docs) {
    const a = doc.data() as Assignment;
    if (!isCurrent(a) || workerStatus.get(a.workerId) === 'terminated') continue;
    const current = occupancy.get(a.positionId) || { headcount: 0, fte: 0 };
    occupancy.set(a.positionId, { headcount: current.headcount + 1, fte: current.fte + assignmentFte(a) });
  }
  return positionSnap.docs.map((d) => {
    const p = d.data() as Position;
    const occ = occupancy.get(p.id) || { headcount: 0, fte: 0 };
    const occupiedHeadcount = occ.headcount;
    const occupiedFte = Number(occ.fte.toFixed(2));
    const availableHeadcount = Math.max(0, p.headcountLimit - occupiedHeadcount);
    const availableFte = Number(Math.max(0, p.headcountLimit * Math.max(0.01, p.fte) - occupiedFte).toFixed(2));
    const occupancyPercent = Math.round((occupiedHeadcount / Math.max(1, p.headcountLimit)) * 100);
    const capacityState: PositionWithOccupancy['capacityState'] = occupiedHeadcount === 0 ? 'vacant' : occupiedHeadcount > p.headcountLimit ? 'over_capacity' : occupiedHeadcount === p.headcountLimit ? 'full' : 'partially_filled';
    return { ...p, occupiedHeadcount, occupiedFte, availableHeadcount, availableFte, occupancyPercent, capacityState };
  });
}

export async function createPosition(actor: ActorContext, raw: unknown) {
  const input = positionCreateSchema.parse(raw);
  const id = randomUUID();
  const timestamp = now();
  const position: Position = { id, ...input, createdAt: timestamp, updatedAt: timestamp };
  const db = adminDb();
  const audit = buildAudit(actor, { action: 'position.create', entityType: 'position', entityId: id, after: position });

  const batch = db.batch();
  batch.create(db.doc(`organizations/${actor.orgId}/positions/${id}`), position);
  batch.create(db.doc(`organizations/${actor.orgId}/positionOccupancy/${id}`), { positionId: id, occupiedHeadcount: 0, occupiedFte: 0, updatedAt: timestamp });
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  const event = buildDomainEvent(actor, 'position.created', 'position', id, { positionCode: position.positionCode, title: position.title });
  batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event);
  await batch.commit();
  return position;
}

export async function listOrgUnits(actor: ActorContext) {
  const snap = await adminDb().collection(`organizations/${actor.orgId}/orgUnits`).orderBy('name').limit(500).get();
  return snap.docs.map((d) => d.data());
}

export async function createOrgUnit(actor: ActorContext, raw: unknown) {
  const input = orgUnitCreateSchema.parse(raw);
  const id = randomUUID();
  const timestamp = now();
  const unit = { id, ...input, status: 'active' as const, createdAt: timestamp, updatedAt: timestamp };
  const db = adminDb();
  const audit = buildAudit(actor, { action: 'org_unit.create', entityType: 'orgUnit', entityId: id, after: unit });
  const batch = db.batch();
  batch.create(db.doc(`organizations/${actor.orgId}/orgUnits/${id}`), unit);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return unit;
}


export async function isDirectReport(actor: ActorContext, workerId: string) {
  if (!actor.workerId) return false;
  const workerSnap = await adminDb().doc(`organizations/${actor.orgId}/workers/${workerId}`).get();
  if (!workerSnap.exists) return false;
  const worker = workerSnap.data() as Worker;
  if (!worker.primaryAssignmentId) return false;
  const assignmentSnap = await adminDb().doc(`organizations/${actor.orgId}/assignments/${worker.primaryAssignmentId}`).get();
  if (!assignmentSnap.exists) return false;
  const assignment = assignmentSnap.data() as Assignment;
  return isCurrent(assignment) && assignment.managerWorkerId === actor.workerId;
}

export async function listManagerTeam(actor: ActorContext) {
  if (!actor.workerId) throw new ApiError(409, 'Membership is not linked to a worker record.', 'worker_link_required');
  const db = adminDb();
  const assignmentSnap = await db.collection(`organizations/${actor.orgId}/assignments`).where('managerWorkerId', '==', actor.workerId).get();
  const currentAssignments = assignmentSnap.docs.map((d) => d.data() as Assignment).filter((a) => a.primary && isCurrent(a));
  const rows = await Promise.all(currentAssignments.map(async (a) => {
    const [workerSnap, positionSnap, unitSnap] = await Promise.all([
      db.doc(`organizations/${actor.orgId}/workers/${a.workerId}`).get(),
      db.doc(`organizations/${actor.orgId}/positions/${a.positionId}`).get(),
      db.doc(`organizations/${actor.orgId}/orgUnits/${a.orgUnitId}`).get(),
    ]);
    return { worker: workerSnap.data(), assignment: a, position: positionSnap.data(), orgUnit: unitSnap.data() };
  }));
  return rows.filter((row) => row.worker && row.worker.status !== 'terminated');
}
