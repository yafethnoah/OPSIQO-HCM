import type { EnterpriseReadinessLevel, EnterpriseRiskNode, EnterpriseRiskStatus, ReleaseGateStatus } from '@/domain/enterprise-command';

export function bounded(value:number){ return Math.max(0,Math.min(100,Math.round(Number.isFinite(value)?value:0))); }
export function readinessLevel(score:number):EnterpriseReadinessLevel { const s=bounded(score); return s<45?'fragile':s<65?'developing':s<85?'controlled':'strategic'; }
export function evidenceStatus(coverage:number){const c=bounded(coverage);return c<25?'insufficient' as const:c<60?'partial' as const:'sufficient' as const;}
export function evidenceCoverage(signals:Array<boolean|number>){if(!signals.length)return 0;const observed=signals.reduce<number>((n,x)=>n+(typeof x==='number'?(x>0?1:0):(x?1:0)),0);return bounded(observed/signals.length*100);}
export function riskStatus(score:number, highCritical=0, overdue=0, assessed=true):EnterpriseRiskStatus {
  if(!assessed) return 'not_assessed';
  if(highCritical>=3 || score<40) return 'critical';
  if(highCritical>0 || overdue>=3 || score<60) return 'high';
  if(overdue>0 || score<80) return 'medium';
  return 'low';
}
export function enterpriseIndex(nodes:EnterpriseRiskNode[]){
  const assessed=nodes.filter(x=>x.assessed);
  const evidenceCoverage=nodes.length?bounded(nodes.reduce((n,x)=>n+x.evidenceCoverage*x.weight,0)/(nodes.reduce((n,x)=>n+x.weight,0)||1)):0;
  if(!assessed.length)return{score:0,level:'not_assessed' as const,assessedDomains:0,totalDomains:nodes.length,evidenceCoverage};
  const totalWeight=assessed.reduce((n,x)=>n+x.weight,0)||1;
  const weighted=assessed.reduce((n,x)=>n+bounded(x.readinessScore)*x.weight,0)/totalWeight;
  const criticalPenalty=assessed.reduce((n,x)=>n+(x.status==='critical'?4:x.status==='high'?2:0),0);
  const overduePenalty=Math.min(12,assessed.reduce((n,x)=>n+x.overdue,0));
  const score=bounded(weighted-criticalPenalty-overduePenalty*.35);
  return {score,level:readinessLevel(score),assessedDomains:assessed.length,totalDomains:nodes.length,evidenceCoverage};
}
export function sloBreach(direction:'higher_better'|'lower_better', current:number, target:number, tolerance:number){
  return direction==='higher_better' ? current < target-tolerance : current > target+tolerance;
}
export function releaseGate(input:{environment:'staging'|'production';readinessOkay:boolean;ciEvidencePresent?:boolean;dependencyInstall:ReleaseGateStatus;typecheck:ReleaseGateStatus;tests:ReleaseGateStatus;rulesTests:ReleaseGateStatus;build:ReleaseGateStatus;aiGovernance:ReleaseGateStatus;lifecycleUat:ReleaseGateStatus}){
  const statuses=[input.dependencyInstall,input.typecheck,input.tests,input.rulesTests,input.build,input.aiGovernance,input.lifecycleUat];
  // Both environments require every mandatory technical gate. Production additionally requires a traceable CI evidence reference.
  const evidenceOkay=input.environment!=='production'||input.ciEvidencePresent===true;
  return input.readinessOkay && evidenceOkay && statuses.every(x=>x==='passed') ? 'ready' as const : 'blocked' as const;
}
