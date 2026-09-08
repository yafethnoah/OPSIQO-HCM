import type{BenefitEnrollment,BenefitPlan}from '@/domain/benefits';
export interface BenefitCarrierExport{provider:string;generatedAt:string;plans:BenefitPlan[];enrollments:BenefitEnrollment[]}
export interface BenefitProviderAdapter{
  readonly providerCode:string;
  validateConfiguration(config:Record<string,unknown>):Promise<{ok:boolean;issues:string[]}>;
  exportEnrollments(input:BenefitCarrierExport):Promise<{externalBatchId:string;accepted:number;rejected:number;errors:{enrollmentId:string;message:string}[]}>;
  reconcile(externalBatchId:string):Promise<{status:'pending'|'completed'|'failed';accepted:number;rejected:number;errors:string[]}>;
}
export class EvidenceOnlyBenefitAdapter implements BenefitProviderAdapter{
  readonly providerCode='evidence_only';
  async validateConfiguration(){return{ok:true,issues:[]}}
  async exportEnrollments(input:BenefitCarrierExport){return{externalBatchId:`evidence-${Date.now()}`,accepted:input.enrollments.length,rejected:0,errors:[]}}
  async reconcile(){return{status:'completed' as const,accepted:0,rejected:0,errors:[]}}
}
