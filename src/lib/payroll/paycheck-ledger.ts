import type { ActorContext } from '@/domain/security';
import type { Assignment, OrgUnit, Position, Worker } from '@/domain/hr';
import type {
  PayrollCalculationRecord,
  PayrollInputSnapshot,
  PayrollRun,
} from '@/domain/payroll';
import type {
  PaycheckLedgerResponse,
  PaycheckLedgerRow,
  PaycheckPayment,
} from '@/domain/paycheck';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import {
  paycheckLedgerFilterSchema,
  paycheckMarkPaidSchema,
} from './paycheck-schemas';
import {
  classifyPaycheckStatus,
  totalPayrollDeductions,
} from './paycheck-ledger-core';

const now = () => new Date().toISOString();
const utcToday = () => now().slice(0, 10);

async function all<T>(path: string, limit = 5000) {
  const snapshot = await adminDb().collection(path).limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
}

function requirePayrollPermission(actor: ActorContext, permission: string) {
  if (!actor.permissions.includes(permission as any)) {
    throw new ApiError(
      403,
      `Payroll permission required: ${permission}.`,
      'forbidden',
    );
  }
}

function activePrimaryAssignments(assignments: Assignment[], asOf: string) {
  const rows = assignments
    .filter(
      (row) =>
        row.primary &&
        row.startDate <= asOf &&
        (!row.endDate || row.endDate >= asOf),
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return Object.fromEntries(rows.map((row) => [row.workerId, row]));
}

function paymentEligibleRun(status: string) {
  return ['exported', 'reconciled', 'completed'].includes(status);
}

export async function listPaycheckLedger(
  actor: ActorContext,
  rawFilters: Record<string, string | undefined> = {},
): Promise<PaycheckLedgerResponse> {
  requirePayrollPermission(actor, 'payroll.read');

  const filters = paycheckLedgerFilterSchema.parse(rawFilters);
  const asOf = filters.asOf || utcToday();
  const base = `organizations/${actor.orgId}`;

  const [
    runs,
    snapshots,
    calculations,
    payments,
    workers,
    assignments,
    positions,
    orgUnits,
  ] = await Promise.all([
    all<PayrollRun>(`${base}/payrollRuns`),
    all<PayrollInputSnapshot>(`${base}/payrollInputSnapshots`),
    all<PayrollCalculationRecord>(`${base}/payrollRunCalculations`),
    all<PaycheckPayment>(`${base}/paycheckPayments`),
    all<Worker>(`${base}/workers`),
    all<Assignment>(`${base}/assignments`),
    all<Position>(`${base}/positions`),
    all<OrgUnit>(`${base}/orgUnits`),
  ]);

  const runMap = Object.fromEntries(runs.map((row) => [row.id, row]));
  const snapshotMap = Object.fromEntries(snapshots.map((row) => [row.id, row]));
  const paymentMap = Object.fromEntries(payments.map((row) => [row.paycheckId, row]));
  const workerMap = Object.fromEntries(workers.map((row) => [row.id, row]));
  const assignmentMap = activePrimaryAssignments(assignments, asOf);
  const positionMap = Object.fromEntries(positions.map((row) => [row.id, row]));
  const orgUnitMap = Object.fromEntries(orgUnits.map((row) => [row.id, row]));

  const rows: PaycheckLedgerRow[] = [];

  for (const calculation of calculations) {
    const run = runMap[calculation.runId];
    const snapshot = snapshotMap[calculation.snapshotId];

    if (!run || !snapshot) continue;
    if (['draft', 'cancelled', 'reversed'].includes(run.status)) continue;

    const paycheckId = `${run.id}_${calculation.workerId}`;
    const payment = paymentMap[paycheckId];
    const dueDate = calculation.result.payDate || snapshot.payDate || run.payDate;
    const status = classifyPaycheckStatus(dueDate, payment, asOf);
    const assignment = assignmentMap[calculation.workerId];
    const position = assignment ? positionMap[assignment.positionId] : undefined;
    const orgUnit = assignment ? orgUnitMap[assignment.orgUnitId] : undefined;
    const worker = workerMap[calculation.workerId];

    rows.push({
      id: paycheckId,
      runId: run.id,
      runName: run.name,
      runStatus: run.status,
      workerId: calculation.workerId,
      employeeNumber: snapshot.employeeNumber || worker?.employeeNumber || '',
      displayName: snapshot.displayName || worker?.displayName || calculation.workerId,
      positionTitle: position?.title,
      orgUnitName: orgUnit?.name,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      dueDate,
      payDateSource: snapshot.payDateSource,
      currency: snapshot.currency,
      gross: calculation.result.gross,
      cppOrQpp: calculation.result.cppOrQpp,
      cpp2OrQpp2: calculation.result.cpp2OrQpp2,
      ei: calculation.result.ei,
      qpip: calculation.result.qpip,
      federalTax: calculation.result.federalTax,
      provincialTax: calculation.result.provincialTax,
      otherDeductions: calculation.result.otherDeductions,
      totalDeductions: totalPayrollDeductions(calculation.result),
      net: calculation.result.net,
      paymentMethodRef: snapshot.paymentMethodRef,
      status,
      canMarkPaid: status !== 'paid' && paymentEligibleRun(run.status),
      paidDate: payment?.paidDate,
      paidAt: payment?.paidAt,
      paidBy: payment?.paidBy,
      paymentReference: payment?.paymentReference,
      paymentNote: payment?.note,
    });
  }

  const filtered = rows
    .filter((row) => filters.status === 'all' || row.status === filters.status)
    .filter((row) => !filters.from || row.dueDate >= filters.from)
    .filter((row) => !filters.to || row.dueDate <= filters.to)
    .filter((row) => !filters.runId || row.runId === filters.runId)
    .filter((row) => !filters.workerId || row.workerId === filters.workerId)
    .sort((a, b) => {
      const due = a.dueDate.localeCompare(b.dueDate);
      if (due !== 0) return due;
      return a.displayName.localeCompare(b.displayName);
    });

  const summary = filtered.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === 'paid') {
        acc.paid += 1;
        acc.totalPaidAmount += row.net;
      } else {
        acc.totalDueAmount += row.net;
        if (row.status === 'upcoming') acc.upcoming += 1;
        if (row.status === 'due_today') acc.dueToday += 1;
        if (row.status === 'overdue') acc.overdue += 1;
      }
      return acc;
    },
    {
      total: 0,
      upcoming: 0,
      dueToday: 0,
      overdue: 0,
      paid: 0,
      totalDueAmount: 0,
      totalPaidAmount: 0,
    },
  );

  summary.totalDueAmount = Math.round(summary.totalDueAmount * 100) / 100;
  summary.totalPaidAmount = Math.round(summary.totalPaidAmount * 100) / 100;

  return { rows: filtered, summary, asOf };
}

export async function markPaycheckPaid(
  actor: ActorContext,
  paycheckId: string,
  raw: unknown,
) {
  requirePayrollPermission(actor, 'payroll.reconcile');
  const input = paycheckMarkPaidSchema.parse(raw);

  if (input.paidDate > utcToday()) {
    throw new ApiError(
      409,
      'Paid date cannot be in the future.',
      'paycheck_paid_date_future',
    );
  }

  const db = adminDb();
  const base = `organizations/${actor.orgId}`;
  const snapshotRef = db.doc(`${base}/payrollInputSnapshots/${paycheckId}`);
  const calculationRef = db.doc(`${base}/payrollRunCalculations/${paycheckId}`);
  const paymentRef = db.doc(`${base}/paycheckPayments/${paycheckId}`);

  return db.runTransaction(async (tx) => {
    const [snapshotDoc, calculationDoc, existingPaymentDoc] = await Promise.all([
      tx.get(snapshotRef),
      tx.get(calculationRef),
      tx.get(paymentRef),
    ]);

    if (!snapshotDoc.exists || !calculationDoc.exists) {
      throw new ApiError(
        404,
        'Paycheck calculation evidence was not found.',
        'paycheck_not_found',
      );
    }

    const snapshot = snapshotDoc.data() as PayrollInputSnapshot;
    const calculation = calculationDoc.data() as PayrollCalculationRecord;
    const runRef = db.doc(`${base}/payrollRuns/${snapshot.runId}`);
    const runDoc = await tx.get(runRef);

    if (!runDoc.exists) {
      throw new ApiError(404, 'Payroll run not found.', 'payroll_run_not_found');
    }

    const run = runDoc.data() as PayrollRun;

    if (!paymentEligibleRun(run.status)) {
      throw new ApiError(
        409,
        'A paycheck can be marked paid only after the payroll run has been exported, reconciled or completed.',
        'paycheck_run_not_payment_ready',
      );
    }

    if (existingPaymentDoc.exists) {
      const existing = existingPaymentDoc.data() as PaycheckPayment;
      if (existing.status === 'paid') return existing;
    }

    const timestamp = now();
    const dueDate = calculation.result.payDate || snapshot.payDate || run.payDate;

    const payment: PaycheckPayment = {
      id: paycheckId,
      paycheckId,
      runId: run.id,
      workerId: snapshot.workerId,
      dueDate,
      netAmount: calculation.result.net,
      currency: snapshot.currency,
      status: 'paid',
      paidDate: input.paidDate,
      paidAt: timestamp,
      paidBy: actor.uid,
      paymentReference: input.paymentReference || undefined,
      note: input.note || undefined,
      createdAt:
        (existingPaymentDoc.data() as PaycheckPayment | undefined)?.createdAt ||
        timestamp,
      updatedAt: timestamp,
    };

    tx.set(paymentRef, payment);

    const audit = buildAudit(actor, {
      action: 'payroll.paycheck.mark_paid',
      entityType: 'paycheckPayment',
      entityId: paycheckId,
      before: existingPaymentDoc.data(),
      after: payment,
      metadata: {
        runId: run.id,
        workerId: snapshot.workerId,
        dueDate,
        netAmount: calculation.result.net,
        currency: snapshot.currency,
      },
    });

    tx.create(db.doc(`${base}/auditLogs/${audit.id}`), audit);
    return payment;
  });
}
