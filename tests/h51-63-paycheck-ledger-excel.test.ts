import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyPaycheckStatus,
  totalPayrollDeductions,
} from '@/lib/payroll/paycheck-ledger-core';
import { paycheckLedgerExcelXml } from '@/lib/payroll/paycheck-excel';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H51.63 paycheck due, paid ledger and Excel export', () => {
  it('classifies upcoming, due today, overdue and paid deterministically', () => {
    expect(classifyPaycheckStatus('2026-09-21', undefined, '2026-09-20')).toBe('upcoming');
    expect(classifyPaycheckStatus('2026-09-20', undefined, '2026-09-20')).toBe('due_today');
    expect(classifyPaycheckStatus('2026-09-19', undefined, '2026-09-20')).toBe('overdue');
    expect(
      classifyPaycheckStatus(
        '2026-09-19',
        {
          id: 'p1',
          paycheckId: 'p1',
          runId: 'r1',
          workerId: 'w1',
          dueDate: '2026-09-19',
          netAmount: 100,
          currency: 'CAD',
          status: 'paid',
          paidDate: '2026-09-19',
          paidAt: '2026-09-19T12:00:00Z',
          paidBy: 'u1',
          createdAt: '2026-09-19T12:00:00Z',
          updatedAt: '2026-09-19T12:00:00Z',
        },
        '2026-09-20',
      ),
    ).toBe('paid');
  });

  it('calculates the paycheck deduction total', () => {
    expect(
      totalPayrollDeductions({
        cppOrQpp: 10,
        cpp2OrQpp2: 2,
        ei: 4,
        qpip: 0,
        federalTax: 20,
        provincialTax: 10,
        otherDeductions: 5,
      }),
    ).toBe(51);
  });

  it('persists paid evidence in a dedicated organization ledger with audit', () => {
    const service = read('src/lib/payroll/paycheck-ledger.ts');
    expect(service).toContain('/paycheckPayments/');
    expect(service).toContain("action: 'payroll.paycheck.mark_paid'");
    expect(service).toContain("requirePayrollPermission(actor, 'payroll.reconcile')");
    expect(service).toContain("['exported', 'reconciled', 'completed']");
  });

  it('derives due dates from authoritative payroll calculation evidence', () => {
    const service = read('src/lib/payroll/paycheck-ledger.ts');
    expect(service).toContain('calculation.result.payDate || snapshot.payDate || run.payDate');
    expect(service).toContain('payDateSource: snapshot.payDateSource');
  });

  it('exposes read, mark-paid and Excel export routes', () => {
    expect(read('src/app/api/organizations/[orgId]/payroll/paychecks/route.ts')).toContain('listPaycheckLedger');
    expect(read('src/app/api/organizations/[orgId]/payroll/paychecks/[paycheckId]/paid/route.ts')).toContain('markPaycheckPaid');
    const exportRoute = read('src/app/api/organizations/[orgId]/payroll/paychecks/export/route.ts');
    expect(exportRoute).toContain('application/vnd.ms-excel');
    expect(exportRoute).toContain('OPSIQO_Paychecks_');
    expect(exportRoute).toContain("actor.permissions.includes('payroll.export')");
  });

  it('builds an Excel workbook with paycheck and summary worksheets', () => {
    const workbook = paycheckLedgerExcelXml({
      asOf: '2026-09-20',
      summary: {
        total: 1,
        upcoming: 0,
        dueToday: 1,
        overdue: 0,
        paid: 0,
        totalDueAmount: 900,
        totalPaidAmount: 0,
      },
      rows: [
        {
          id: 'r1_w1',
          runId: 'r1',
          runName: 'September payroll',
          runStatus: 'exported',
          workerId: 'w1',
          employeeNumber: 'E001',
          displayName: 'Test Worker',
          periodStart: '2026-09-01',
          periodEnd: '2026-09-15',
          dueDate: '2026-09-20',
          payDateSource: 'worker_calendar',
          currency: 'CAD',
          gross: 1000,
          cppOrQpp: 20,
          cpp2OrQpp2: 0,
          ei: 10,
          qpip: 0,
          federalTax: 40,
          provincialTax: 30,
          otherDeductions: 0,
          totalDeductions: 100,
          net: 900,
          status: 'due_today',
          canMarkPaid: true,
        },
      ],
    });

    expect(workbook).toContain('ss:Name="Paychecks"');
    expect(workbook).toContain('ss:Name="Summary"');
    expect(workbook).toContain('Paycheck Due Date');
    expect(workbook).toContain('Payment Reference');
  });

  it('adds paycheck ledger visibility to Payroll and authorized Compensation', () => {
    const payroll = read('src/components/payroll-workspace.tsx');
    const compensation = read('src/components/compensation-workspace.tsx');
    expect(payroll).toContain('<PaycheckLedger />');
    expect(compensation).toContain("'paychecks'");
    expect(compensation).toContain("actor.permissions.includes('payroll.read')");
    expect(compensation).toContain('<PaycheckLedger/>');
  });

  it('downloads an Excel-compatible file through authenticated apiDownload', () => {
    const component = read('src/components/paycheck-ledger.tsx');
    expect(component).toContain('apiDownload');
    expect(component).toContain('Download Paycheck Excel');
    expect(component).toContain('Mark as Paid');
    expect(component).toContain('Saved as Paid');
  });
});
