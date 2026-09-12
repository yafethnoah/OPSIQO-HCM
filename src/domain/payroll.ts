export type PayrollProviderStatus='draft'|'configured'|'active'|'suspended';
export type PayrollRunStatus='draft'|'calculated'|'review'|'approved'|'exported'|'reconciled'|'completed'|'reversed'|'cancelled';
export type PayrollRunKind='regular'|'off_cycle'|'correction'|'termination';
export type PayrollRunMode='uat'|'production';
export type PayrollAdjustmentStatus='submitted'|'approved'|'rejected'|'consumed';
export type PayrollAdjustmentType='bonus'|'commission'|'vacation'|'stat_holiday'|'taxable_benefit'|'pre_tax_deduction'|'other_deduction'|'additional_tax'|'retro'|'termination';
export type PayrollRegulatoryState='reference_only'|'validated_pending_certification'|'certified';

export interface PayrollProviderConfig{id:string;code:string;name:string;adapterCode:string;status:PayrollProviderStatus;secretRefs:string[];mappingVersion:string;environment?:PayrollRunMode;createdBy:string;createdAt:string;updatedBy:string;updatedAt:string}
export interface PayrollSyncRun{id:string;providerId:string;direction:'outbound'|'inbound'|'reconcile';status:'queued'|'running'|'completed'|'failed'|'partial';startedAt:string;completedAt?:string;records:number;accepted:number;rejected:number;errors:{recordId?:string;code:string;message:string}[];traceId:string;createdBy:string}
export interface PayrollCalculationInput{workerId:string;province:'AB'|'BC'|'MB'|'NB'|'NL'|'NS'|'NT'|'NU'|'ON'|'PE'|'QC'|'SK'|'YT';payDate:string;payPeriodsPerYear:number;grossRegular:number;overtime:number;bonus:number;commission:number;vacationPay:number;statHolidayPay:number;taxableBenefits:number;preTaxDeductions:number;otherDeductions:number;federalClaimAmount:number;provincialClaimAmount:number;additionalTax:number;ytdPensionable:number;ytdCppOrQpp:number;ytdCpp2OrQpp2:number;ytdInsurable:number;ytdEi:number;ytdQpip:number}
export interface PayrollCalculationResult{workerId:string;province:string;payDate:string;gross:number;taxable:number;cppOrQpp:number;cpp2OrQpp2:number;ei:number;qpip:number;federalTax:number;provincialTax:number;otherDeductions:number;net:number;ruleVersion:string;authoritativeSources:string[];warnings:string[];independentReferenceValidationRequired:boolean}

export interface PayrollWorkerProfile{
  id:string;workerId:string;province:PayrollCalculationInput['province'];payPeriodsPerYear:number;
  federalClaimAmount:number;provincialClaimAmount:number;additionalTax:number;
  recurringTaxableBenefits:number;recurringPreTaxDeductions:number;recurringOtherDeductions:number;paymentMethodRef?:string;
  enabled:boolean;createdBy:string;createdAt:string;updatedBy:string;updatedAt:string;
}
export interface PayrollAdjustment{
  id:string;workerId:string;type:PayrollAdjustmentType;amount:number;payDate?:string;targetRunId?:string;
  note:string;evidenceRefs:string[];status:PayrollAdjustmentStatus;sourceCompensationCorrectionId?:string;
  createdBy:string;createdAt:string;approvedBy?:string;approvedAt?:string;rejectedBy?:string;rejectedAt?:string;
  consumedByRunId?:string;consumedAt?:string;
}
export interface PayrollInputSnapshot{
  id:string;runId:string;workerId:string;employeeNumber:string;displayName:string;currency:string;
  compensationRecordId:string;timesheetIds:string[];leaveRequestIds:string[];adjustmentIds:string[];
  regularHours:number;overtimeHours:number;paidLeaveHours:number;baseRate:number;overtimeMultiplier:number;paymentMethodRef?:string;
  input:PayrollCalculationInput;sourceHash:string;sourceUpdatedAts:string[];warnings:string[];
  immutableAt:string;createdBy:string;
}
export interface PayrollCalculationRecord{
  id:string;runId:string;workerId:string;snapshotId:string;sourceHash:string;calculationHash:string;
  result:PayrollCalculationResult;calculatedBy:string;calculatedAt:string;
}
export interface PayrollRunTotals{workers:number;gross:number;employeeDeductions:number;net:number}
export interface PayrollRun{
  id:string;name:string;payDate:string;periodStart:string;periodEnd:string;status:PayrollRunStatus;
  kind?:PayrollRunKind;mode?:PayrollRunMode;workerIds?:string[];providerId?:string;sourceRunId?:string;reason?:string;
  idempotencyKey?:string;requestHash?:string;calculationIds:string[];snapshotIds?:string[];totals?:PayrollRunTotals;
  providerBatchId?:string;reconciliationId?:string;createdBy:string;createdAt:string;
  calculatedBy?:string;calculatedAt?:string;reviewedBy?:string;reviewedAt?:string;reviewNote?:string;
  approvedBy?:string;approvedAt?:string;approvalNote?:string;exportedBy?:string;exportedAt?:string;
  reconciledBy?:string;reconciledAt?:string;completedBy?:string;completedAt?:string;
  reversedBy?:string;reversedAt?:string;reversalReason?:string;
}
export interface PayrollReconciliationIssue{workerId:string;field:string;expected:number|string;actual:number|string;delta?:number;severity:'warning'|'high';message:string}
export interface PayrollReconciliation{
  id:string;runId:string;providerId:string;providerBatchId:string;status:'matched'|'exceptions';
  compared:number;matched:number;mismatched:number;issues:PayrollReconciliationIssue[];
  reconciledBy:string;reconciledAt:string;
}
export interface PayStatement{
  id:string;runId:string;workerId:string;employeeNumber:string;displayName:string;periodStart:string;periodEnd:string;payDate:string;
  currency:string;gross:number;taxable:number;pensionable:number;insurable:number;cppOrQpp:number;cpp2OrQpp2:number;ei:number;qpip:number;
  federalTax:number;provincialTax:number;otherDeductions:number;net:number;
  ytd:{gross:number;cppOrQpp:number;cpp2OrQpp2:number;ei:number;qpip:number;federalTax:number;provincialTax:number;net:number};
  sourceHash:string;calculationHash:string;ruleVersion:string;status:'final';createdAt:string;createdBy:string;
  reversedAt?:string;reversedBy?:string;
}
export interface PayrollReferenceCase{
  id:string;source:string;sourceReference:string;input:PayrollCalculationInput;
  expected:Pick<PayrollCalculationResult,'gross'|'taxable'|'cppOrQpp'|'cpp2OrQpp2'|'ei'|'qpip'|'federalTax'|'provincialTax'|'otherDeductions'|'net'>;
}
export interface PayrollReferenceValidation{
  id:string;ruleVersion:string;caseCount:number;passed:number;failed:number;tolerance:number;
  status:'pass'|'fail';failures:{caseId:string;field:string;expected:number;actual:number;delta:number}[];
  sourceReferences:string[];validatedBy:string;validatedAt:string;
}
export interface PayrollRegulatoryStatus{
  id:'default';state:PayrollRegulatoryState;ruleVersion:string;minimumCases:number;lastValidationId?:string;
  certifiedBy?:string;certifiedAt?:string;certificationNote?:string;updatedAt:string;
}
export interface PayrollDashboard{
  providers:PayrollProviderConfig[];syncRuns:PayrollSyncRun[];payrollRuns:PayrollRun[];
  workerProfiles:PayrollWorkerProfile[];adjustments:PayrollAdjustment[];regulatoryStatus:PayrollRegulatoryStatus;
  metrics:{key:string;label:string;value:number|string;helper:string}[];ruleVersion:string;
  regulatedValidationStatus:'implementation_ready_reference_validation_required'|'uat_controls_ready_reference_validation_required'|'certified';
  generatedAt:string;disclaimer:string;
}
