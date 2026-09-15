export type PayCalendarScope = 'organization'|'org_unit'|'pay_group'|'worker';
export type PayCalendarRuleType = 'run_default'|'offset_days'|'fixed_day_of_month'|'last_business_day';
export type WeekendAdjustment = 'none'|'previous_weekday'|'next_weekday';

export interface PayrollCalendarRuleRecord {
  id:string;
  scope:PayCalendarScope;
  targetId?:string;
  rule:PayCalendarRuleType;
  offsetDays?:number;
  dayOfMonth?:number;
  weekendAdjustment:WeekendAdjustment;
  effectiveDate:string;
  endDate?:string;
  reason:string;
  status:'active'|'inactive';
  createdBy:string;
  createdAt:string;
  updatedBy:string;
  updatedAt:string;
}

export type VariablePayType =
  'bonus'|'commission'|'shift_premium'|'overtime'|'allowance'|'car_allowance'|'housing_allowance'|
  'meal_allowance'|'expense_reimbursement'|'retention_bonus'|'signing_bonus'|'performance_award'|'other';

export interface VariablePayComponentRecord {
  id:string;
  workerId:string;
  type:VariablePayType;
  calculationMethod:'fixed'|'percent_of_base'|'hourly';
  amount:number;
  units?:number;
  frequency:'one_time'|'per_pay'|'monthly'|'quarterly'|'annual';
  currency:string;
  payDate?:string;
  taxTreatmentRef?:string;
  effectiveDate:string;
  endDate?:string;
  evidenceRefs:string[];
  status:'draft'|'submitted'|'approved'|'rejected'|'prepared';
  createdBy:string;
  createdAt:string;
  reviewedBy?:string;
  reviewedAt?:string;
  preparedAdjustmentId?:string;
}

export interface PayrollRetroCase {
  id:string;
  workerId:string;
  effectiveDate:string;
  approvalDate:string;
  previousAnnualPay:number;
  newAnnualPay:number;
  payPeriodsPerYear:number;
  affectedPeriods:number;
  retroAmount:number;
  payDate:string;
  reason:string;
  evidenceRefs:string[];
  status:'draft'|'submitted'|'approved'|'rejected'|'prepared';
  createdBy:string;
  createdAt:string;
  reviewedBy?:string;
  reviewedAt?:string;
  preparedAdjustmentId?:string;
}

export interface CompensationChangeRequest {
  id:string;
  workerId:string;
  currentRecordId?:string;
  currentAnnualPay:number;
  proposedPayBasis:'annual_salary'|'monthly_salary'|'hourly';
  proposedBasePay:number;
  proposedAnnualPay:number;
  currency:string;
  effectiveDate:string;
  reason:'merit'|'promotion'|'market'|'equity'|'adjustment'|'demotion'|'other';
  rationale:string;
  evidenceRefs:string[];
  budgetImpactAnnual:number;
  budgetImpactRemainingYear:number;
  firstAffectedPayrollDate?:string;
  bandStatus:'inside'|'below'|'above'|'unmapped';
  proposedCompaRatioPct?:number;
  status:'draft'|'submitted'|'hr_review'|'approved'|'rejected'|'applied';
  createdBy:string;
  createdAt:string;
  updatedBy:string;
  updatedAt:string;
  reviewedBy?:string;
  reviewedAt?:string;
  decisionNote?:string;
  appliedRecordId?:string;
}

export interface PayrollAnomaly {
  id:string;
  workerId:string;
  displayName:string;
  metric:'gross'|'net';
  previousAmount:number;
  currentAmount:number;
  delta:number;
  deltaPct:number;
  severity:'warning'|'high';
  explained:boolean;
  explanation:string;
  currentRunId?:string;
}

export interface CompensationPositioningFlag {
  workerId:string;
  displayName:string;
  positionTitle?:string;
  annualPay:number;
  bandMinAnnual?:number;
  bandMidAnnual?:number;
  bandMaxAnnual?:number;
  compaRatioPct?:number;
  state:'below_band'|'inside_band'|'above_band'|'unmapped';
  marketP50?:number;
  marketGap?:number;
}

export const COMP_PAY_AI_GUARDRAILS = [
  'AI may explain, classify, summarize and recommend review actions.',
  'AI may not approve compensation changes, release payroll, change bank details, override blockers or submit government filings.',
  'AI outputs are decision support and require an authorized human for consequential actions.',
] as const;