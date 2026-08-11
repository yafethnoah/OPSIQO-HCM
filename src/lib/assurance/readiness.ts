import type { AssuranceControlTest, AssuranceEvidence, AssuranceFinding, AssuranceCapaPlan, AssuranceEvidenceRequest, AssuranceReadiness } from '@/domain/assurance';
const pct=(n:number,d:number)=>d?Math.round((n/d)*100):0;
export function calculateAssuranceReadiness(input:{evidence:AssuranceEvidence[];tests:AssuranceControlTest[];findings:AssuranceFinding[];capaPlans:AssuranceCapaPlan[];requests:AssuranceEvidenceRequest[];today:string}):AssuranceReadiness{
  const evidence=input.evidence.filter(e=>e.status==='active');
  const verified=evidence.filter(e=>e.integrityStatus==='verified').length;
  const approved=input.tests.filter(t=>t.status==='approved'&&t.result!=='not_applicable');
  const effective=approved.filter(t=>t.result==='effective').length+approved.filter(t=>t.result==='partially_effective').length*.5;
  const evidenceCoverage=pct(verified,evidence.length);
  const approvedTestEffectiveness=approved.length?Math.round(effective/approved.length*100):0;
  const overdueRequests=input.requests.filter(r=>!['accepted','closed','cancelled'].includes(r.status)&&r.dueDate<input.today).length;
  const overdueCapa=input.capaPlans.filter(c=>!['verified','closed','cancelled'].includes(c.status)&&c.dueDate<input.today).length;
  const highCritical=input.findings.filter(f=>['open','action_planned'].includes(f.status)&&['high','critical'].includes(f.severity)).length;
  const overduePenalty=Math.min(35,(overdueRequests*3)+(overdueCapa*5)+(highCritical*5));
  const raw=(evidenceCoverage*.35)+(approvedTestEffectiveness*.45)+20-overduePenalty;
  const score=!evidence.length&&!approved.length?0:Math.max(0,Math.min(100,Math.round(raw)));
  const level=score>=85?'advanced':score>=70?'managed':score>=50?'developing':'emerging';
  return{score,level,evidenceCoverage,approvedTestEffectiveness,overduePenalty,openHighCriticalFindings:highCritical,explanation:'Operational assurance-readiness indicator only. It measures evidence integrity, approved testing outcomes and overdue assurance work; it does not certify legal or regulatory compliance.'};
}
