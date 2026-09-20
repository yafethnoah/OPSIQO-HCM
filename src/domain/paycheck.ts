export type PaycheckDisplayStatus = 'upcoming' | 'due_today' | 'overdue' | 'paid';

export interface PaycheckPayment {
  id: string;
  paycheckId: string;
  runId: string;
  workerId: string;
  dueDate: string;
  netAmount: number;
  currency: string;
  status: 'paid';
  paidDate: string;
  paidAt: string;
  paidBy: string;
  paymentReference?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaycheckLedgerRow {
  id: string;
  runId: string;
  runName: string;
  runStatus: string;
  workerId: string;
  employeeNumber: string;
  displayName: string;
  positionTitle?: string;
  orgUnitName?: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  payDateSource: string;
  currency: string;
  gross: number;
  cppOrQpp: number;
  cpp2OrQpp2: number;
  ei: number;
  qpip: number;
  federalTax: number;
  provincialTax: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
  paymentMethodRef?: string;
  status: PaycheckDisplayStatus;
  canMarkPaid: boolean;
  paidDate?: string;
  paidAt?: string;
  paidBy?: string;
  paymentReference?: string;
  paymentNote?: string;
}

export interface PaycheckLedgerSummary {
  total: number;
  upcoming: number;
  dueToday: number;
  overdue: number;
  paid: number;
  totalDueAmount: number;
  totalPaidAmount: number;
}

export interface PaycheckLedgerResponse {
  rows: PaycheckLedgerRow[];
  summary: PaycheckLedgerSummary;
  asOf: string;
}
