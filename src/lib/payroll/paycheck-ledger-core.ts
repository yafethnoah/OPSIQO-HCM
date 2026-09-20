import type { PaycheckDisplayStatus, PaycheckPayment } from '@/domain/paycheck';

export function classifyPaycheckStatus(
  dueDate: string,
  payment: PaycheckPayment | undefined,
  asOf: string,
): PaycheckDisplayStatus {
  if (payment?.status === 'paid') return 'paid';
  if (dueDate < asOf) return 'overdue';
  if (dueDate === asOf) return 'due_today';
  return 'upcoming';
}

export function totalPayrollDeductions(result: {
  cppOrQpp: number;
  cpp2OrQpp2: number;
  ei: number;
  qpip: number;
  federalTax: number;
  provincialTax: number;
  otherDeductions: number;
}) {
  return Math.round(
    (
      Number(result.cppOrQpp || 0) +
      Number(result.cpp2OrQpp2 || 0) +
      Number(result.ei || 0) +
      Number(result.qpip || 0) +
      Number(result.federalTax || 0) +
      Number(result.provincialTax || 0) +
      Number(result.otherDeductions || 0)
    ) * 100,
  ) / 100;
}
