export const CONTRACT_FIELD_KEYS=[
 'employerName','employeeName','employeeEmail','employeeNumber','jobTitle','department','managerName','workLocation','employmentType','startDate','endDate','probationPeriod','hoursPerWeek','schedule','basePay','payFrequency','bonusCommission','vacationEntitlement','benefits','overtimeTerms','terminationNotice','confidentiality','nonSolicitation','nonCompetition','intellectualProperty','governingLaw','signatureDate','employeeSigned','employerSigned'
] as const;
export type ContractFieldKey=typeof CONTRACT_FIELD_KEYS[number];
export interface ContractExtractedField{value:string|null;confidence:number;sourceSnippet:string|null;sourcePage?:number|null;verified:boolean;humanEdited?:boolean}
export interface ContractWorkerMatch{workerId:string;displayName:string;employeeNumber?:string;score:number;reason:string}
export interface ContractImportDraft{
 id:string;status:'draft'|'confirmed'|'cancelled';fileName:string;mimeType:string;sha256:string;size:number;
 storagePath?:string;scanStatus:'not_scanned'|'clean'|'blocked';parser:'deterministic'|'governed_ai';provider?:string;model?:string;promptVersion:string;
 documentType:string;language:string;summary:string;overallConfidence:number;fields:Record<ContractFieldKey,ContractExtractedField>;warnings:string[];
 workerMatches:ContractWorkerMatch[];createdBy:string;createdAt:string;expiresAt:string;confirmedBy?:string;confirmedAt?:string;
}
export interface ContractModulePrefill{
 coreHr:Record<string,string>;compensation:Record<string,string>;contractGovernance:Record<string,string>;
}
