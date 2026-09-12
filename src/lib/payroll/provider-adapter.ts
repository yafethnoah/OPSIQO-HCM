export interface PayrollOutboundRecord{workerId:string;employment:Record<string,unknown>;compensation:Record<string,unknown>;time:Record<string,unknown>;leave:Record<string,unknown>;earnings:Record<string,unknown>;deductions:Record<string,unknown>;payment:Record<string,unknown>}
export interface PayrollInboundRecord{workerId:string;grossPay:number;deductions:number;incomeTax:number;cppOrQpp:number;ei:number;qpip?:number;benefits:number;netPay:number;status:string;journal:Record<string,unknown>}
export interface PayrollProviderAdapter{readonly adapterCode:string;validateConfiguration(config:Record<string,unknown>):Promise<{ok:boolean;issues:string[]}>;push(records:PayrollOutboundRecord[]):Promise<{batchId:string;accepted:number;rejected:number;errors:{recordId?:string;code:string;message:string}[]}>;pull(cursor?:string):Promise<{cursor?:string;records:PayrollInboundRecord[]}>;reconcile(batchId:string):Promise<{status:'pending'|'completed'|'failed'|'partial';errors:string[]}>}
export class EvidenceSandboxPayrollAdapter implements PayrollProviderAdapter{
  readonly adapterCode='evidence_sandbox';
  async validateConfiguration(){return{ok:true,issues:[]}}
  async push(records:PayrollOutboundRecord[]){return{batchId:`sandbox-${Date.now()}`,accepted:records.length,rejected:0,errors:[]}}
  async pull(){return{records:[]}}
  async reconcile(){return{status:'completed' as const,errors:[]}}
}
