import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { Application, Candidate, Interview, InterviewScorecard, Offer, Requisition } from '@/domain/recruiting';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { buildDomainEvent } from '@/lib/events/build';
import { createEmployee } from '@/lib/hr/service';
import { createWorkerCompensation } from '@/lib/compensation/service';
import {
  applicationStageSchema, candidateApplicationCreateSchema, hireConversionSchema, interviewCreateSchema,
  offerActionSchema, offerCreateSchema, requisitionActionSchema, requisitionCreateSchema, scorecardCreateSchema,
} from './schemas';

const now = () => new Date().toISOString();
const hrRoles = new Set(['super_admin', 'org_admin', 'hr_admin', 'hr_partner']);
const adminRoles = new Set(['super_admin', 'org_admin', 'hr_admin']);

async function getRequisition(actor: ActorContext, requisitionId: string) {
  const snap = await adminDb().doc(`organizations/${actor.orgId}/requisitions/${requisitionId}`).get();
  if (!snap.exists) throw new ApiError(404, 'Requisition not found.', 'requisition_not_found');
  const req = snap.data() as Requisition;
  if (!hrRoles.has(actor.role) && req.hiringManagerWorkerId !== actor.workerId) throw new ApiError(403, 'Requisition is outside your hiring scope.', 'recruiting_scope');
  return req;
}


async function finalizeInternalMobilityConversion(actor: ActorContext, applicationId: string, workerId: string) {
  const db = adminDb();
  const snap = await db.collection(`organizations/${actor.orgId}/internalMobilityInterests`).where('applicationId', '==', applicationId).limit(1).get();
  if (snap.empty) return;
  const doc = snap.docs[0]!; const before = doc.data() as { status?: string; workerId?: string; [key:string]: unknown };
  if (before.status === 'converted') return;
  const timestamp = now(); const after = { ...before, status: 'converted', convertedWorkerId: workerId, convertedAt: timestamp, updatedAt: timestamp };
  const audit = buildAudit(actor, { action: 'career.internal_mobility.convert', entityType: 'internalMobilityInterest', entityId: doc.id, before, after, metadata: { applicationId, workerId } });
  const batch = db.batch(); batch.update(doc.ref, { status: 'converted', convertedWorkerId: workerId, convertedAt: timestamp, updatedAt: timestamp }); batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit); await batch.commit();
}


async function ensureHireCompensation(actor: ActorContext, application: Application, offer: Offer, workerId: string, hireDate: string) {
  if (typeof offer.baseSalary !== 'number' && typeof offer.hourlyRate !== 'number') return;
  const payBasis = typeof offer.baseSalary === 'number' ? 'annual_salary' : 'hourly';
  const basePay = typeof offer.baseSalary === 'number' ? offer.baseSalary : Number(offer.hourlyRate || 0);
  const annualizedBasePay = payBasis === 'annual_salary' ? basePay : Math.round(basePay * 2080 * 100) / 100;
  await createWorkerCompensation(actor, { workerId, effectiveDate: hireDate, currency: offer.currency, payBasis, basePay, annualizedBasePay, variableTargetPct: Number(offer.bonusTargetPct || 0), allowancesAnnual: 0, changeReason:'hire', note:`Initial compensation from accepted offer ${offer.id}.` }, { recordId:`hire_${application.id}` });
}

async function applicationBundle(actor: ActorContext, applicationId: string) {
  const db = adminDb();
  const appSnap = await db.doc(`organizations/${actor.orgId}/applications/${applicationId}`).get();
  if (!appSnap.exists) throw new ApiError(404, 'Application not found.', 'application_not_found');
  const application = appSnap.data() as Application;
  const requisition = await getRequisition(actor, application.requisitionId);
  const candidateSnap = await db.doc(`organizations/${actor.orgId}/candidates/${application.candidateId}`).get();
  if (!candidateSnap.exists) throw new ApiError(409, 'Application candidate record is missing.', 'candidate_missing');
  return { application, requisition, candidate: candidateSnap.data() as Candidate };
}

export async function listRequisitions(actor: ActorContext): Promise<Requisition[]> {
  let q: any = adminDb().collection(`organizations/${actor.orgId}/requisitions`);
  if (!hrRoles.has(actor.role)) {
    if (!actor.workerId) return [];
    q = q.where('hiringManagerWorkerId', '==', actor.workerId);
  }
  const snap = await q.orderBy('createdAt', 'desc').limit(250).get();
  return snap.docs.map((d: any) => d.data() as Requisition);
}

export async function createRequisition(actor: ActorContext, raw: unknown) {
  const input = requisitionCreateSchema.parse(raw); const db = adminDb(); const id = randomUUID(); const timestamp = now();
  if (!hrRoles.has(actor.role) && actor.workerId !== input.hiringManagerWorkerId) throw new ApiError(403, 'Managers can only create requisitions for themselves as hiring manager.', 'recruiting_scope');
  let result!: Requisition;
  await db.runTransaction(async tx => {
    const [positionSnap, unitSnap, managerSnap, counterSnap] = await Promise.all([
      tx.get(db.doc(`organizations/${actor.orgId}/positions/${input.positionId}`)),
      tx.get(db.doc(`organizations/${actor.orgId}/orgUnits/${input.orgUnitId}`)),
      tx.get(db.doc(`organizations/${actor.orgId}/workers/${input.hiringManagerWorkerId}`)),
      tx.get(db.doc(`organizations/${actor.orgId}/counters/requisition`)),
    ]);
    if (!positionSnap.exists || !unitSnap.exists || !managerSnap.exists) throw new ApiError(409, 'Position, organization unit, or hiring manager does not exist.', 'invalid_requisition_reference');
    if (positionSnap.data()?.orgUnitId !== input.orgUnitId) throw new ApiError(409, 'Position does not belong to selected organization unit.', 'position_org_mismatch');
    if (['closed','frozen'].includes(String(positionSnap.data()?.status))) throw new ApiError(409, 'Closed or frozen positions cannot be recruited.', 'position_not_recruitable');
    if (input.headcount > Number(positionSnap.data()?.headcountLimit || 1)) throw new ApiError(409, 'Requisition headcount exceeds position capacity.', 'requisition_over_capacity');
    if (managerSnap.data()?.status !== 'active') throw new ApiError(409, 'Hiring manager must be an active worker.', 'inactive_hiring_manager');
    const sequence = Number(counterSnap.data()?.value || 0) + 1;
    const requisitionNumber = `REQ-${new Date().getUTCFullYear()}-${String(sequence).padStart(4, '0')}`;
    result = { id, requisitionNumber, ...input, openingsRemaining: input.headcount, status: 'draft', requestedBy: actor.uid, createdAt: timestamp, updatedAt: timestamp };
    const audit = buildAudit(actor, { action: 'requisition.create', entityType: 'requisition', entityId: id, after: result });
    const event = buildDomainEvent(actor, 'requisition.created', 'requisition', id, { requisitionNumber, positionId: input.positionId });
    tx.set(db.doc(`organizations/${actor.orgId}/counters/requisition`), { value: sequence, updatedAt: timestamp }, { merge: true });
    tx.create(db.doc(`organizations/${actor.orgId}/requisitions/${id}`), result);
    tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
    tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event);
  });
  return result;
}

export async function actOnRequisition(actor: ActorContext, requisitionId: string, raw: unknown) {
  const { action } = requisitionActionSchema.parse(raw); const current = await getRequisition(actor, requisitionId); const timestamp = now();
  if (action === 'approve' && !adminRoles.has(actor.role)) throw new ApiError(403, 'HR administrator approval is required.', 'requisition_approval_required');
  if (['open', 'hold', 'cancel', 'close'].includes(action) && !hrRoles.has(actor.role)) throw new ApiError(403, 'HR permission required for this requisition action.', 'forbidden');
  const allowed: Record<string, string[]> = { submit: ['draft'], approve: ['pending_approval'], open: ['approved', 'on_hold'], hold: ['open'], cancel: ['draft', 'pending_approval', 'approved', 'open', 'on_hold'], close: ['open', 'on_hold'] };
  if (!allowed[action].includes(current.status)) throw new ApiError(409, `Cannot ${action} requisition from ${current.status}.`, 'invalid_requisition_state');
  const patch: Partial<Requisition> = { updatedAt: timestamp };
  if (action === 'submit') patch.status = 'pending_approval';
  if (action === 'approve') Object.assign(patch, { status: 'approved', approvedBy: actor.uid, approvedAt: timestamp });
  if (action === 'open') Object.assign(patch, { status: 'open', openedAt: current.openedAt || timestamp });
  if (action === 'hold') patch.status = 'on_hold';
  if (action === 'cancel') Object.assign(patch, { status: 'cancelled', closedAt: timestamp });
  if (action === 'close') Object.assign(patch, { status: 'closed', closedAt: timestamp });
  const next = { ...current, ...patch } as Requisition; const db = adminDb(); const audit = buildAudit(actor, { action: `requisition.${action}`, entityType: 'requisition', entityId: requisitionId, before: current, after: next });
  const batch = db.batch(); batch.update(db.doc(`organizations/${actor.orgId}/requisitions/${requisitionId}`), patch); batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  if (action === 'open') { const event = buildDomainEvent(actor, 'requisition.opened', 'requisition', requisitionId, { requisitionNumber: current.requisitionNumber }); batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event); }
  await batch.commit(); return next;
}

export async function listApplications(actor: ActorContext, requisitionId?: string): Promise<Array<Application & { candidate?: Candidate; requisition?: Requisition }>> {
  if (requisitionId) await getRequisition(actor, requisitionId);
  const db = adminDb(); let q: any = db.collection(`organizations/${actor.orgId}/applications`);
  if (requisitionId) q = q.where('requisitionId', '==', requisitionId);
  const snap = await q.orderBy('updatedAt', 'desc').limit(500).get();
  let applications: Application[] = snap.docs.map((d: any) => d.data() as Application);
  if (!hrRoles.has(actor.role)) {
    const reqs = await listRequisitions(actor); const allowed = new Set(reqs.map(r => r.id)); applications = applications.filter(a => allowed.has(a.requisitionId));
  }
  const candidateIds = [...new Set(applications.map(a => a.candidateId))];
  const reqIds = [...new Set(applications.map(a => a.requisitionId))];
  const candidates = await Promise.all(candidateIds.map(async id => (await db.doc(`organizations/${actor.orgId}/candidates/${id}`).get()).data() as Candidate | undefined));
  const reqs = await Promise.all(reqIds.map(async id => (await db.doc(`organizations/${actor.orgId}/requisitions/${id}`).get()).data() as Requisition | undefined));
  const cMap = Object.fromEntries(candidates.filter(Boolean).map(c => [c!.id, c])); const rMap = Object.fromEntries(reqs.filter(Boolean).map(r => [r!.id, r]));
  return applications.map(a => ({ ...a, candidate: cMap[a.candidateId], requisition: rMap[a.requisitionId] }));
}

export async function createCandidateApplication(actor: ActorContext, raw: unknown) {
  const input = candidateApplicationCreateSchema.parse(raw); const req = await getRequisition(actor, input.requisitionId); if (req.status !== 'open') throw new ApiError(409, 'Applications can only be added to an open requisition.', 'requisition_not_open');
  const db = adminDb(); const timestamp = now(); const normalizedEmail = input.email.trim().toLowerCase(); const emailKey = encodeURIComponent(normalizedEmail); let result: any;
  await db.runTransaction(async tx => {
    const emailIndexRef = db.doc(`organizations/${actor.orgId}/candidateEmailIndex/${emailKey}`); const emailIndex = await tx.get(emailIndexRef);
    let candidateId = emailIndex.data()?.candidateId as string | undefined; let candidate: Candidate;
    if (candidateId) {
      const candidateRef = db.doc(`organizations/${actor.orgId}/candidates/${candidateId}`);
      const existing = await tx.get(candidateRef); if (!existing.exists) throw new ApiError(409, 'Candidate email index is inconsistent.', 'candidate_index_inconsistent');
      const current = existing.data() as Candidate;
      candidate = { ...current, firstName: input.firstName || current.firstName, lastName: input.lastName || current.lastName, displayName: `${input.firstName || current.firstName} ${input.lastName || current.lastName}`.trim(), phone: input.phone || current.phone, location: input.location || current.location, source: input.source || current.source, linkedinUrl: input.linkedinUrl || current.linkedinUrl, resumeText: input.resumeText || current.resumeText, consentAt: timestamp, updatedAt: timestamp };
      tx.set(candidateRef, candidate, { merge: true });
    } else {
      const newCandidateId = randomUUID(); candidateId = newCandidateId; candidate = { id: newCandidateId, firstName: input.firstName, lastName: input.lastName, displayName: `${input.firstName} ${input.lastName}`.trim(), email: input.email, emailLower: normalizedEmail, phone: input.phone, location: input.location, source: input.source, linkedinUrl: input.linkedinUrl, resumeText: input.resumeText, consentAt: timestamp, createdAt: timestamp, updatedAt: timestamp };
    }
    const resolvedCandidateId = candidateId!;
    const appIndexRef = db.doc(`organizations/${actor.orgId}/candidateApplicationIndex/${encodeURIComponent(`${resolvedCandidateId}_${req.id}`)}`); const appIndex = await tx.get(appIndexRef); if (appIndex.exists) throw new ApiError(409, 'Candidate already has an application for this requisition.', 'duplicate_application');
    if (!emailIndex.exists) { tx.create(db.doc(`organizations/${actor.orgId}/candidates/${resolvedCandidateId}`), candidate); tx.create(emailIndexRef, { candidateId: resolvedCandidateId, email: normalizedEmail, createdAt: timestamp }); }
    const applicationId = randomUUID(); const application: Application = { id: applicationId, requisitionId: req.id, candidateId: resolvedCandidateId, stage: 'applied', ownerUid: actor.uid, source: input.source, appliedAt: timestamp, consentAt: timestamp, updatedAt: timestamp };
    const audit = buildAudit(actor, { action: 'application.create', entityType: 'application', entityId: applicationId, after: application, metadata: { candidateId: resolvedCandidateId, requisitionId: req.id } });
    const event = buildDomainEvent(actor, 'application.created', 'application', applicationId, { candidateId: resolvedCandidateId, requisitionId: req.id });
    tx.create(db.doc(`organizations/${actor.orgId}/applications/${applicationId}`), application); tx.create(appIndexRef, { applicationId, candidateId: resolvedCandidateId, requisitionId: req.id, createdAt: timestamp }); tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit); tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event); result = { candidate, application };
  }); return result;
}

export async function updateApplicationStage(actor: ActorContext, applicationId: string, raw: unknown) {
  const input = applicationStageSchema.parse(raw); const { application } = await applicationBundle(actor, applicationId);
  if (!hrRoles.has(actor.role) && !['screening', 'interview', 'assessment'].includes(input.stage)) throw new ApiError(403, 'Hiring managers cannot make final disposition or offer decisions.', 'forbidden');
  const allowedTransitions: Record<Application['stage'], Application['stage'][]> = {
    applied: ['screening', 'interview', 'assessment', 'rejected', 'withdrawn'],
    screening: ['interview', 'assessment', 'offer', 'rejected', 'withdrawn'],
    interview: ['assessment', 'offer', 'rejected', 'withdrawn'],
    assessment: ['interview', 'offer', 'rejected', 'withdrawn'],
    offer: ['rejected', 'withdrawn'],
    hired: [], rejected: [], withdrawn: [],
  };
  if (!allowedTransitions[application.stage].includes(input.stage)) throw new ApiError(409, `Cannot move application from ${application.stage} to ${input.stage}.`, 'invalid_application_transition');
  if (['rejected', 'withdrawn'].includes(input.stage) && !input.dispositionReason) throw new ApiError(400, 'Disposition reason is required.', 'disposition_required');
  const timestamp = now(); const next = { ...application, ...input, updatedAt: timestamp } as Application; const db = adminDb(); const audit = buildAudit(actor, { action: 'application.stage.update', entityType: 'application', entityId: applicationId, before: application, after: next }); const event = buildDomainEvent(actor, 'application.stage_changed', 'application', applicationId, { from: application.stage, to: input.stage, requisitionId: application.requisitionId, candidateId: application.candidateId }); const batch = db.batch(); batch.update(db.doc(`organizations/${actor.orgId}/applications/${applicationId}`), { ...input, updatedAt: timestamp }); batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit); batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event); await batch.commit(); return next;
}

export async function createInterview(actor: ActorContext, raw: unknown) {
  const input = interviewCreateSchema.parse(raw); const { application } = await applicationBundle(actor, input.applicationId); if (!['applied','screening','interview','assessment'].includes(application.stage)) throw new ApiError(409, `Interview cannot be scheduled while application is ${application.stage}.`, 'interview_stage_invalid'); const db = adminDb(); const interviewerUids:string[]=[]; for (const workerId of input.interviewerWorkerIds) { const memberSnap = await db.collection(`organizations/${actor.orgId}/memberships`).where('workerId','==',workerId).where('status','==','active').limit(1).get(); const uid = memberSnap.docs[0]?.id; if (!uid) throw new ApiError(409, `Interviewer ${workerId} has no active platform membership.`, 'interviewer_membership_required'); interviewerUids.push(uid); } const timestamp = now(); const interview: Interview = { id: randomUUID(), applicationId: application.id, requisitionId: application.requisitionId, candidateId: application.candidateId, interviewType: input.interviewType, scheduledAt: input.scheduledAt, durationMinutes: input.durationMinutes, interviewerUids, interviewerWorkerIds: input.interviewerWorkerIds, location: input.location, meetingUrl: input.meetingUrl, status: 'scheduled', createdBy: actor.uid, createdAt: timestamp, updatedAt: timestamp }; const audit = buildAudit(actor, { action: 'interview.create', entityType: 'interview', entityId: interview.id, after: interview }); const stageEvent = buildDomainEvent(actor, 'application.stage_changed', 'application', application.id, { from: application.stage, to: 'interview', requisitionId: application.requisitionId, candidateId: application.candidateId, source: 'interview.create' }); const batch = db.batch(); batch.create(db.doc(`organizations/${actor.orgId}/interviews/${interview.id}`), interview); batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit); if (application.stage !== 'interview') { batch.update(db.doc(`organizations/${actor.orgId}/applications/${application.id}`), { stage: 'interview', updatedAt: timestamp }); batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${stageEvent.id}`), stageEvent); } await batch.commit(); return interview;
}

export async function submitScorecard(actor: ActorContext, interviewId: string, raw: unknown) {
  const input = scorecardCreateSchema.parse(raw); const db = adminDb(); const interviewSnap = await db.doc(`organizations/${actor.orgId}/interviews/${interviewId}`).get(); if (!interviewSnap.exists) throw new ApiError(404, 'Interview not found.', 'interview_not_found'); const interview = interviewSnap.data() as Interview; if (!hrRoles.has(actor.role) && !interview.interviewerUids.includes(actor.uid)) throw new ApiError(403, 'Only assigned interviewers can submit this scorecard.', 'interview_scope'); const id = `${interviewId}_${actor.uid}`; const ref = db.doc(`organizations/${actor.orgId}/scorecards/${encodeURIComponent(id)}`); const existing = await ref.get(); if (existing.exists) throw new ApiError(409, 'You already submitted a scorecard for this interview.', 'scorecard_exists'); const timestamp = now(); const scorecard: InterviewScorecard = { id, interviewId, applicationId: interview.applicationId, evaluatorUid: actor.uid, recommendation: input.recommendation, ratings: input.ratings, overallComment: input.overallComment, submittedAt: timestamp, updatedAt: timestamp }; const audit = buildAudit(actor, { action: 'interview.scorecard.submit', entityType: 'scorecard', entityId: id, after: scorecard }); const batch = db.batch(); batch.create(ref, scorecard); batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit); await batch.commit(); return scorecard;
}

export async function createOffer(actor: ActorContext, raw: unknown) {
  const input = offerCreateSchema.parse(raw); const { application } = await applicationBundle(actor, input.applicationId); if (!['screening','interview','assessment'].includes(application.stage)) throw new ApiError(409, `Offer cannot be created while application is ${application.stage}.`, 'offer_stage_invalid'); if (!hrRoles.has(actor.role)) throw new ApiError(403, 'HR permission is required to prepare an offer.', 'forbidden');
  const db = adminDb(); const activeOffers = await db.collection(`organizations/${actor.orgId}/offers`).where('applicationId', '==', application.id).get();
  if (activeOffers.docs.some((d: any) => ['draft','pending_approval','approved','sent','accepted'].includes(String(d.data()?.status)))) throw new ApiError(409, 'This application already has an active offer. Withdraw or resolve it before creating another.', 'active_offer_exists');
  const timestamp = now(); const offer: Offer = { id: randomUUID(), applicationId: application.id, requisitionId: application.requisitionId, candidateId: application.candidateId, status: 'draft', currency: input.currency, baseSalary: input.baseSalary, hourlyRate: input.hourlyRate, bonusTargetPct: input.bonusTargetPct, startDate: input.startDate, expiresAt: input.expiresAt, notes: input.notes, createdBy: actor.uid, createdAt: timestamp, updatedAt: timestamp }; const audit = buildAudit(actor, { action: 'offer.create', entityType: 'offer', entityId: offer.id, after: offer }); const batch = db.batch(); batch.create(db.doc(`organizations/${actor.orgId}/offers/${offer.id}`), offer); batch.update(db.doc(`organizations/${actor.orgId}/applications/${application.id}`), { stage: 'offer', updatedAt: timestamp }); batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  if (application.stage !== 'offer') { const stageEvent = buildDomainEvent(actor, 'application.stage_changed', 'application', application.id, { from: application.stage, to: 'offer', requisitionId: application.requisitionId, candidateId: application.candidateId, source: 'offer.create' }); batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${stageEvent.id}`), stageEvent); }
  await batch.commit(); return offer;
}

export async function actOnOffer(actor: ActorContext, offerId: string, raw: unknown) {
  const { action } = offerActionSchema.parse(raw); const db = adminDb(); const snap = await db.doc(`organizations/${actor.orgId}/offers/${offerId}`).get(); if (!snap.exists) throw new ApiError(404, 'Offer not found.', 'offer_not_found'); const offer = snap.data() as Offer; await applicationBundle(actor, offer.applicationId); if (!hrRoles.has(actor.role)) throw new ApiError(403, 'HR permission required.', 'forbidden'); if (action === 'approve' && !adminRoles.has(actor.role)) throw new ApiError(403, 'HR administrator approval required.', 'offer_approval_required'); const allowed: Record<string, string[]> = { submit: ['draft'], approve: ['pending_approval'], send: ['approved'], accept: ['sent'], decline: ['sent'], withdraw: ['draft', 'pending_approval', 'approved', 'sent'] }; if (!allowed[action].includes(offer.status)) throw new ApiError(409, `Cannot ${action} offer from ${offer.status}.`, 'invalid_offer_state'); if (action === 'accept' && offer.expiresAt && offer.expiresAt < new Date().toISOString().slice(0,10)) throw new ApiError(409, 'Expired offers cannot be recorded as accepted without issuing a new offer.', 'offer_expired'); const timestamp = now(); const patch: Partial<Offer> = { updatedAt: timestamp };
  if (action === 'submit') patch.status = 'pending_approval'; if (action === 'approve') Object.assign(patch, { status: 'approved', approvedBy: actor.uid, approvedAt: timestamp }); if (action === 'send') Object.assign(patch, { status: 'sent', sentAt: timestamp }); if (action === 'accept') Object.assign(patch, { status: 'accepted', acceptedAt: timestamp }); if (action === 'decline') Object.assign(patch, { status: 'declined', declinedAt: timestamp }); if (action === 'withdraw') patch.status = 'withdrawn'; const next = { ...offer, ...patch } as Offer; const audit = buildAudit(actor, { action: `offer.${action}`, entityType: 'offer', entityId: offer.id, before: offer, after: next }); const batch = db.batch(); batch.update(snap.ref, patch); batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit); if (action === 'accept') { const event = buildDomainEvent(actor, 'offer.accepted', 'offer', offer.id, { applicationId: offer.applicationId, candidateId: offer.candidateId, requisitionId: offer.requisitionId }); batch.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event); } await batch.commit(); return next;
}

export async function hireCandidate(actor: ActorContext, raw: unknown) {
  const input = hireConversionSchema.parse(raw); if (input.hireDate > new Date().toISOString().slice(0, 10)) throw new ApiError(409, 'Future-start hires must remain in preboarding until their effective start date. Phase 2 onboarding will activate them without occupying the position early.', 'future_hire_requires_preboarding'); if (!adminRoles.has(actor.role)) throw new ApiError(403, 'HR administrator permission is required for hire conversion.', 'hire_permission_required'); const { application, requisition, candidate } = await applicationBundle(actor, input.applicationId); const db = adminDb(); const offerSnap = await db.doc(`organizations/${actor.orgId}/offers/${input.offerId}`).get(); if (!offerSnap.exists) throw new ApiError(404, 'Offer not found.', 'offer_not_found'); const offer = offerSnap.data() as Offer; if (offer.applicationId !== application.id || offer.status !== 'accepted') throw new ApiError(409, 'An accepted offer for this application is required.', 'accepted_offer_required'); if (application.hiredWorkerId) { await ensureHireCompensation(actor,application,offer,application.hiredWorkerId,input.hireDate); await finalizeInternalMobilityConversion(actor, application.id, application.hiredWorkerId); return { workerId: application.hiredWorkerId, deduplicated: true }; }
  const conversionRef = db.doc(`organizations/${actor.orgId}/hireConversionIndex/${encodeURIComponent(application.id)}`);
  const conversionSnap = await conversionRef.get();
  if (conversionSnap.exists && conversionSnap.data()?.workerId) { const recoveredWorkerId=conversionSnap.data()!.workerId as string; await ensureHireCompensation(actor,application,offer,recoveredWorkerId,input.hireDate); await finalizeInternalMobilityConversion(actor, application.id, recoveredWorkerId); return { workerId: recoveredWorkerId, deduplicated: true }; }
  const existingWorkIndex = await db.doc(`organizations/${actor.orgId}/workEmailIndex/${encodeURIComponent(input.workEmail.trim().toLowerCase())}`).get(); let workerId = existingWorkIndex.data()?.workerId as string | undefined;
  if (workerId) {
    const workerSnap = await db.doc(`organizations/${actor.orgId}/workers/${workerId}`).get();
    const existingWorker = workerSnap.data() as { employeeNumber?:string; personId?:string } | undefined;
    const personSnap = existingWorker?.personId ? await db.doc(`organizations/${actor.orgId}/people/${existingWorker.personId}`).get() : null;
    const personalEmail = String(personSnap?.data()?.personalEmail || '').toLowerCase();
    if (existingWorker?.employeeNumber?.toLowerCase() !== input.employeeNumber.toLowerCase() || personalEmail !== (input.personalEmail || candidate.email).toLowerCase()) throw new ApiError(409, 'Work email is already assigned to another employee.', 'work_email_conflict');
  } else {
    const created = await createEmployee(actor, { legalFirstName: input.legalFirstName || candidate.firstName, legalLastName: input.legalLastName || candidate.lastName, preferredName: input.preferredName, workEmail: input.workEmail, personalEmail: input.personalEmail || candidate.email, phone: input.phone || candidate.phone, employeeNumber: input.employeeNumber, employmentType: input.employmentType, hireDate: input.hireDate, positionId: requisition.positionId, orgUnitId: requisition.orgUnitId, managerWorkerId: requisition.hiringManagerWorkerId }); workerId = created.worker.id;
  }
  if (!workerId) throw new ApiError(500, 'Hire conversion did not resolve a worker identity.', 'hire_worker_missing');
  const timestamp = now(); const audit = buildAudit(actor, { action: 'application.hire', entityType: 'application', entityId: application.id, before: application, after: { ...application, stage: 'hired', hiredWorkerId: workerId, hiredAt: timestamp }, metadata: { offerId: offer.id, requisitionId: requisition.id } }); const event = buildDomainEvent(actor, 'hire.completed', 'worker', workerId, { applicationId: application.id, requisitionId: requisition.id, candidateId: candidate.id });
  await db.runTransaction(async tx => { const appRef = db.doc(`organizations/${actor.orgId}/applications/${application.id}`); const reqRef = db.doc(`organizations/${actor.orgId}/requisitions/${requisition.id}`); const [freshApp, freshReq] = await Promise.all([tx.get(appRef), tx.get(reqRef)]); if (freshApp.data()?.hiredWorkerId) return; const remaining = Math.max(0, Number(freshReq.data()?.openingsRemaining || 0) - 1); tx.update(appRef, { stage: 'hired', hiredWorkerId: workerId, hiredAt: timestamp, updatedAt: timestamp }); tx.update(reqRef, { openingsRemaining: remaining, status: remaining === 0 ? 'filled' : freshReq.data()?.status, closedAt: remaining === 0 ? timestamp : freshReq.data()?.closedAt || null, updatedAt: timestamp }); tx.create(conversionRef, { applicationId: application.id, offerId: offer.id, workerId, createdAt: timestamp }); tx.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit); const stageEvent = buildDomainEvent(actor, 'application.stage_changed', 'application', application.id, { from: application.stage, to: 'hired', requisitionId: requisition.id, candidateId: candidate.id, source: 'hire.convert' }); tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${stageEvent.id}`), stageEvent); tx.create(db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`), event); });
  await ensureHireCompensation(actor,application,offer,workerId,input.hireDate);
  await finalizeInternalMobilityConversion(actor, application.id, workerId);
  return { workerId, deduplicated: false };
}

export async function recruitingDashboard(actor: ActorContext) {
  const reqs = await listRequisitions(actor); const apps = await listApplications(actor); const counts = { openRequisitions: reqs.filter(r => r.status === 'open').length, applications: apps.length, interviews: apps.filter(a => a.stage === 'interview').length, offers: apps.filter(a => a.stage === 'offer').length, hires: apps.filter(a => a.stage === 'hired').length }; return { counts, requisitions: reqs.slice(0, 10), applications: apps.slice(0, 50) };
}

export async function listInterviews(actor: ActorContext, applicationId?: string): Promise<Interview[]> {
  const db = adminDb(); let q: any = db.collection(`organizations/${actor.orgId}/interviews`); if (applicationId) { await applicationBundle(actor, applicationId); q = q.where('applicationId', '==', applicationId); }
  const snap = await q.orderBy('scheduledAt', 'desc').limit(250).get(); let rows = snap.docs.map((d: any) => d.data() as Interview);
  if (!hrRoles.has(actor.role)) { const reqs = await listRequisitions(actor); const allowed = new Set(reqs.map(r => r.id)); rows = rows.filter((r: Interview) => allowed.has(r.requisitionId) || r.interviewerUids.includes(actor.uid)); }
  return rows;
}

export async function listOffers(actor: ActorContext, applicationId?: string) {
  if (!hrRoles.has(actor.role)) throw new ApiError(403, 'HR permission required to view offer compensation.', 'forbidden');
  const db = adminDb(); let q: any = db.collection(`organizations/${actor.orgId}/offers`); if (applicationId) { await applicationBundle(actor, applicationId); q = q.where('applicationId', '==', applicationId); }
  const snap = await q.orderBy('createdAt', 'desc').limit(250).get(); return snap.docs.map((d: any) => d.data() as Offer);
}
